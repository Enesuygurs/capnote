// Loading and saving collections through the main-process file storage

import { DEFAULT_SETTINGS, LEGACY_STORAGE_KEYS } from '../constants.js';
import { i18n } from '../i18n.js';

export class StorageFeature {
  async initStorage() {
    const { initialized, data } = await window.electronAPI.storage.load();
    this.storedData = data || {};
    if (initialized) {
      await this.loadSettingsData();
      return;
    }

    // First launch with file storage: move existing localStorage data over, then drop it
    const legacy = Object.entries(LEGACY_STORAGE_KEYS);
    for (const [key, legacyKey] of legacy) {
      const raw = localStorage.getItem(legacyKey);
      if (raw === null) continue;
      try {
        this.storedData[key] = JSON.parse(raw);
        await window.electronAPI.storage.save(key, this.storedData[key]);
      } catch (err) {
        console.error(`Could not migrate ${legacyKey}:`, err);
        // Keep localStorage untouched (and the file storage uninitialized) so the move is retried
        this.settings = { ...DEFAULT_SETTINGS, ...this.readLegacySettings() };
        return;
      }
    }
    legacy.forEach(([, legacyKey]) => localStorage.removeItem(legacyKey));
    await this.loadSettingsData();
  }

  // Persist one collection; failures are reported instead of silently losing data
  async persist(key, value, errorKey) {
    try {
      await window.electronAPI.storage.save(key, value);
    } catch (error) {
      console.error(`Saving ${key} failed:`, error);
      if (errorKey && this.notification) this.showNotification(i18n.t(errorKey), 'error');
    }
  }

  // What gets persisted: locked notes keep only their encrypted payload, never plaintext
  serializeNotes() {
    return this.notes.map((note) => (note.isLocked ? { ...note, content: '' } : note));
  }

  async loadNotes() {
    try {
      this.notes = Array.isArray(this.storedData.notes) ? this.storedData.notes : [];

      // Eski notlarda eksik property'leri ekle
      this.notes.forEach((note) => {
        note.id = String(note.id);
        if (!note.isLocked) {
          note.content = this.toPortableUploadUrls(note.content);
          note.attachments = this.extractUploadNames(note.content);
          const counts = this.countWordsAndCharsFromHtml(note.content || '');
          note.wordCount = counts.words;
          note.charCount = counts.chars;
        }
        note.folderId = this.toId(note.folderId);
        if (note.isLocked === undefined) {
          note.isLocked = false;
        }
        // Older versions persisted the temporary unlock flag; drop it
        delete note.isUnlocked;
        if (!note.formatting) {
          note.formatting = this.getDefaultFormatting();
        } else {
          note.formatting = {
            fontFamily: note.formatting.fontFamily || this.defaultFormatting.fontFamily,
            fontSize: note.formatting.fontSize || this.defaultFormatting.fontSize,
          };
        }
      });

      // Notları tarih sırasına göre sırala
      this.notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Notlar yüklenirken hata:', error);
      this.notes = [];
    }

    await this.migrateLegacyLockedNotes();

    // Klasörleri yükle
    await this.loadFolders();

    // Notes pointing at a missing folder are shown nowhere; move them back to the root list
    const folderIds = new Set(this.folders.map((f) => f.id));
    this.notes.forEach((note) => {
      if (note.folderId && !folderIds.has(note.folderId)) {
        note.folderId = null;
      }
    });
  }

  async loadFolders() {
    try {
      this.folders = Array.isArray(this.storedData.folders) ? this.storedData.folders : [];
      // Ensure older saved folders get a default expanded flag (true)
      this.folders = this.folders.map((f) => ({
        expanded: f.expanded !== undefined ? f.expanded : true,
        ...f,
        id: String(f.id),
      }));
    } catch (error) {
      console.error('Klasörler yüklenirken hata:', error);
      this.folders = [];
    }
  }

  async saveNotes() {
    // Ensure overview stats reflect the latest notes immediately
    this.updateStats();
    await this.persist('notes', this.serializeNotes(), 'messages.notesSaveError');
  }

  async saveFolders() {
    await this.persist('folders', this.folders, 'messages.foldersSaveError');
  }

  async loadReminders() {
    try {
      this.reminders = Array.isArray(this.storedData.reminders) ? this.storedData.reminders : [];
      // Normalize reminders: ensure recurrence field exists
      this.reminders = this.reminders.map((r) => ({
        ...r,
        id: String(r.id),
        noteId: this.toId(r.noteId),
        recurrence: r.recurrence || 'none',
        recurrenceDays: Array.isArray(r.recurrenceDays)
          ? r.recurrenceDays
          : r.recurrenceDays
            ? r.recurrenceDays
            : [],
        dismissed: r.dismissed || false,
      }));
      // Older reminders stored the raw datetime-local value; store ISO timestamps only
      this.reminders.forEach((r) => {
        const date = new Date(r.datetime);
        if (!isNaN(date)) r.datetime = date.toISOString();
      });
      // Drop dismissed reminders only; overdue ones are reported by checkDueReminders
      this.reminders = this.reminders.filter((r) => !r.dismissed);
      await this.saveReminders(); // Clean up storage
    } catch (error) {
      console.error('Hatırlatmalar yüklenirken hata:', error);
      this.reminders = [];
    }
  }

  async saveReminders() {
    await this.persist('reminders', this.reminders, 'messages.remindersSaveError');
  }

  async loadNotifications() {
    try {
      const savedNotifications = Array.isArray(this.storedData.notifications)
        ? this.storedData.notifications
        : [];
      this.notifications = savedNotifications.map((n) => ({
        ...n,
        id: String(n.id),
        noteId: this.toId(n.noteId),
      }));
      // Sort by time, newest first
      this.notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
    } catch (error) {
      console.error('Bildirimler yüklenirken hata:', error);
      this.notifications = [];
    }
  }

  async saveNotifications() {
    await this.persist('notifications', this.notifications);
  }

  async loadTodos() {
    try {
      const savedSections = Array.isArray(this.storedData.todos) ? this.storedData.todos : [];
      this.todoSections = savedSections.map((section) => ({
        ...section,
        id: String(section.id),
        todos: (section.todos || []).map((todo) => ({ ...todo, id: String(todo.id) })),
      }));
    } catch (error) {
      console.error('Yapılacaklar yüklenirken hata:', error);
      this.todoSections = [];
    }
  }

  async saveTodos() {
    await this.persist('todos', this.todoSections);
  }
}
