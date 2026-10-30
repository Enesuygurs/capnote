// Full data backup export and import

import { SCHEMA_VERSION, DEFAULT_SETTINGS, LOCAL_ONLY_SETTINGS } from '../constants.js';
import { i18n } from '../i18n.js';
import { toMoodKey, toWeatherKey } from '../data/moods.js';

export class BackupFeature {
  // Everything in one object: notes, folders, reminders, notifications, to-dos, portable settings
  // and the uploaded files the notes use
  async buildBackupData() {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: SCHEMA_VERSION,
      notes: this.serializeNotes(),
      folders: this.folders || [],
      reminders: this.reminders || [],
      notifications: this.notifications || [],
      todos: this.todoSections || [],
      settings: {},
    };

    // Portable settings only (no folder colour backup or last opened note)
    Object.entries(this.settings).forEach(([key, value]) => {
      if (!LOCAL_ONLY_SETTINGS.includes(key)) exportData.settings[key] = value;
    });

    // Embed the uploaded files the notes use so images survive a move to another machine
    const attachmentNames = new Set();
    exportData.notes.forEach((note) =>
      (note.attachments || []).forEach((name) => attachmentNames.add(name))
    );
    if (attachmentNames.size > 0) {
      exportData.attachments = await window.electronAPI.uploads.read([...attachmentNames]);
    }
    return exportData;
  }

  // Export everything: the save dialog's file type picks a Capnote backup (.json) or Markdown files
  async exportData() {
    let choice;
    try {
      choice = await window.electronAPI.chooseExport({
        defaultName: `capnote-${new Date().toISOString().split('T')[0]}`,
        labels: {
          backup: i18n.t('transfer.backupType'),
          markdown: i18n.t('transfer.markdownType'),
        },
      });
    } catch (err) {
      console.error('Export failed:', err);
      choice = { ok: false };
    }
    if (!choice || !choice.ok) {
      if (!choice || !choice.canceled)
        this.showNotification(i18n.t('messages.exportFailed'), 'error');
      return;
    }
    if (choice.format === 'markdown') {
      await this.writeMarkdownExport();
      return;
    }
    let result;
    try {
      result = await window.electronAPI.writeBackup(
        JSON.stringify(await this.buildBackupData(), null, 2)
      );
    } catch (err) {
      console.error('Data export failed:', err);
      result = { ok: false };
    }
    this.reportSave(result, 'messages.dataExported');
  }

  // Import the files the user picks: each backup (.json) as a backup, the Markdown files as notes
  async importData() {
    let result;
    try {
      result = await window.electronAPI.importData({ label: i18n.t('transfer.importType') });
    } catch (err) {
      console.error('Import failed:', err);
      result = { ok: false };
    }
    if (!result || !result.ok) {
      if (!result || !result.canceled)
        this.showNotification(i18n.t('messages.dataImportError'), 'error');
      return;
    }
    for (const file of result.files.filter((f) => f.kind === 'backup')) {
      await this.importBackupText(file.content);
    }
    const markdown = result.files.filter((f) => f.kind === 'markdown');
    if (markdown.length) {
      const notes = await this.importMarkdownFiles(markdown);
      this.showNotification(i18n.t('markdown.imported', { count: notes.length }), 'success');
      if (notes.length) this.selectNote(notes[0]);
    }
  }

  // Import a backup's text, asking which parts to take and whether to merge or replace
  async importBackupText(text) {
    try {
      let data = JSON.parse(text || '{}');

      // Validate structure
      if (!data || typeof data !== 'object') throw new Error(i18n.t('messages.invalidFileFormat'));

      // Normalize common single-note or array exports into { notes: [...] }
      // Support: a single note object (exported via exportNote json) or an array of notes
      if (Array.isArray(data)) {
        data = { notes: data };
      } else if (
        !data.notes &&
        (data.content !== undefined || data.title !== undefined || data.id !== undefined)
      ) {
        // Looks like a single note object
        data = { notes: [data] };
      }

      // Backups from a newer version may use a layout this version does not understand
      if (typeof data.version === 'number' && data.version > SCHEMA_VERSION) {
        throw new Error(i18n.t('messages.backupTooNew'));
      }

      // Count items
      const notesCount = Array.isArray(data.notes) ? data.notes.length : 0;
      const foldersCount = Array.isArray(data.folders) ? data.folders.length : 0;
      const remindersCount = Array.isArray(data.reminders) ? data.reminders.length : 0;
      const notifsCount = Array.isArray(data.notifications) ? data.notifications.length : 0;
      const todosCount = Array.isArray(data.todos) ? data.todos.length : 0;

      // Ask user which types to import and whether to merge or replace
      const importOptions = await this.showImportOptionsDialog({
        notes: notesCount > 0,
        folders: foldersCount > 0,
        reminders: remindersCount > 0,
        notifications: notifsCount > 0,
        todos: todosCount > 0,
        settings: !!data.settings,
      });

      if (!importOptions) {
        this.showNotification(i18n.t('messages.importCancelled'), 'warning');
        return;
      }

      const merge = importOptions.merge;

      if (!merge) {
        // clear only the types the user chose to import (replace behaviour per-type)
        if (importOptions.notes) this.notes = [];
        if (importOptions.folders) this.folders = [];
        if (importOptions.reminders) this.reminders = [];
        if (importOptions.notifications) this.notifications = [];
        if (importOptions.todos) this.todoSections = [];
      }

      // Remap folder IDs to avoid collisions when merging
      const folderIdMap = {};
      if (Array.isArray(data.folders) && importOptions.folders) {
        data.folders.forEach((f) => {
          // A folder with the same name takes the imported notes instead of a copy of it
          const sameName = this.folders.find(
            (existing) =>
              String(existing.name || '').toLowerCase() === String(f.name || '').toLowerCase()
          );
          if (sameName) {
            folderIdMap[f.id] = sameName.id;
            return;
          }
          const newId = this.newId();
          folderIdMap[f.id] = newId;
          const newFolder = { ...f, id: newId };
          newFolder.expanded = newFolder.expanded !== undefined ? newFolder.expanded : true;
          this.folders.push(newFolder);
        });
      }

      // Import notes and remap folderId + build noteId map
      const noteIdMap = {};
      let skippedDuplicates = 0;
      if (Array.isArray(data.notes) && importOptions.notes) {
        data.notes.forEach((note) => {
          const oldId = note.id;
          // Re-importing the same backup must not duplicate notes
          const existing = this.notes.find(
            (n) =>
              n.createdAt === note.createdAt && n.title === note.title && n.content === note.content
          );
          if (existing) {
            skippedDuplicates++;
            if (oldId !== undefined && oldId !== null) noteIdMap[oldId] = existing.id;
            return;
          }
          const newNoteId = this.newId();
          // A folder reference that was not imported would make the note invisible
          const mappedFolderId =
            note.folderId && folderIdMap[note.folderId] ? folderIdMap[note.folderId] : null;
          const newNote = {
            ...note,
            id: newNoteId,
            folderId: mappedFolderId,
            mood: toMoodKey(note.mood),
            weather: toWeatherKey(note.weather),
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          // Compute word/char counts for imported note so stats reflect correctly
          try {
            const counts = this.countWordsAndCharsFromHtml(newNote.content || '');
            newNote.wordCount = counts.words;
            newNote.charCount = counts.chars;
          } catch (e) {
            newNote.wordCount = note.wordCount || 0;
            newNote.charCount = note.charCount || 0;
          }

          this.notes.push(newNote);
          if (oldId !== undefined && oldId !== null) noteIdMap[oldId] = newNoteId;
        });
      }

      // Import reminders and notifications with noteId remapping
      if (Array.isArray(data.reminders) && importOptions.reminders) {
        data.reminders.forEach((r) => {
          const newR = { ...r };
          newR.id = this.newId();
          if (newR.noteId) {
            // remap if possible
            if (noteIdMap[newR.noteId]) {
              newR.noteId = noteIdMap[newR.noteId];
            } else {
              // unknown note reference -> null it
              newR.noteId = null;
            }
          }
          const exists = this.reminders.some(
            (r2) => r2.noteId === newR.noteId && r2.datetime === newR.datetime
          );
          if (!exists) this.reminders.push(newR);
        });
      }

      if (Array.isArray(data.notifications) && importOptions.notifications) {
        data.notifications.forEach((n) => {
          const newN = { ...n };
          newN.id = this.newId();
          if (newN.noteId) {
            if (noteIdMap[newN.noteId]) {
              newN.noteId = noteIdMap[newN.noteId];
            } else {
              newN.noteId = null;
            }
          }
          const exists = this.notifications.some(
            (n2) =>
              n2.noteId === newN.noteId &&
              n2.kind === newN.kind &&
              n2.at === newN.at &&
              n2.time === newN.time
          );
          if (!exists) this.notifications.push(newN);
        });
      }

      // Import settings (merge by default)
      if (importOptions.settings && data.settings && typeof data.settings === 'object') {
        // Accept known settings with the expected type; older backups stored strings
        const defaults = DEFAULT_SETTINGS;
        const legacyNames = {
          syncFolderAccent: 'syncFolderAccent',
          darkMode: 'darkMode',
          accentColor: 'accentColor',
        };
        Object.entries(data.settings).forEach(([key, value]) => {
          const name = legacyNames[key] || key;
          if (!(name in defaults) || LOCAL_ONLY_SETTINGS.includes(name)) return;
          const expected = typeof defaults[name];
          if (expected === 'boolean' && typeof value === 'string')
            value = value === 'true' || value === '1';
          if (expected === 'number' && typeof value === 'string') value = parseInt(value, 10);
          if (defaults[name] !== null && typeof value !== expected) return;
          this.settings[name] = value;
        });
        await this.persist('settings', this.settings);
      }

      // Todo sections are merged by name, skipping tasks that already exist, so re-importing
      // a backup does not duplicate them; imported records get fresh ids
      if (Array.isArray(data.todos) && importOptions.todos) {
        data.todos.forEach((section) => {
          const name = String(section.name || '');
          let target = this.todoSections.find((existing) => existing.name === name);
          if (!target) {
            target = { id: this.newId(), name, todos: [] };
            this.todoSections.push(target);
          }
          (Array.isArray(section.todos) ? section.todos : []).forEach((todo) => {
            const text = String(todo.text || '');
            if (target.todos.some((existing) => existing.text === text)) return;
            target.todos.push({ ...todo, id: this.newId(), text, completed: !!todo.completed });
          });
        });
      }

      // Restore the files referenced by the imported notes
      if (importOptions.notes && data.attachments && typeof data.attachments === 'object') {
        await window.electronAPI.uploads.write(data.attachments);
      }

      // Encrypt locked notes coming from old backups that still carry a plain password
      await this.migrateLegacyLockedNotes();

      // Nothing may point at what a replace removed: notes in missing folders go to the root
      // list, reminders and notifications of missing notes go, the open note closes
      const folderIds = new Set(this.folders.map((f) => f.id));
      this.notes.forEach((n) => {
        if (n.folderId && !folderIds.has(n.folderId)) n.folderId = null;
      });
      const noteIds = new Set(this.notes.map((n) => n.id));
      this.reminders = this.reminders.filter((r) => !r.noteId || noteIds.has(r.noteId));
      this.notifications = this.notifications.filter((n) => !n.noteId || noteIds.has(n.noteId));
      if (this.currentNote && !noteIds.has(this.currentNote.id)) {
        this.currentNote = null;
        this.showWelcome();
      }

      // Persist everything
      // Each save reports its own failures
      await this.saveFolders();
      await this.saveNotes();
      await this.saveReminders();
      await this.saveNotifications();
      await this.saveTodos();

      // Reload UI/state
      this.loadSettings();
      this.loadSidebarPreference();
      this.updateFoldersList();
      this.updateNotesList();
      this.updateFolderNotes();
      // Refresh reminders/notifications UI and counters
      this.updateRemindersView();
      this.updateNotificationsView();
      this.updateActiveRemindersCount();
      this.updateActiveNotificationsCount();
      this.renderTodosSections();
      this.updateTodosCount();

      this.updateStats();

      if (skippedDuplicates > 0)
        console.info(`Import skipped ${skippedDuplicates} duplicate note(s)`);
      this.showNotification(i18n.t('messages.dataImported'), 'success');
      this.settingsModal.classList.remove('show');
      this.settingsModal.classList.add('hidden');
    } catch (err) {
      console.error('Import all data error', err);
      this.showNotification(`${i18n.t('messages.dataImportError')} ${err.message || err}`, 'error');
    }
  }

  // Show a small modal dialog letting user pick which types to import and merge vs replace
  showImportOptionsDialog(available) {
    return new Promise((resolve) => {
      // create modal element using app modal classes so styling matches
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.display = 'flex';
      const content = document.createElement('div');
      content.className = 'modal-content modal-sm import-modal';

      // header
      const header = document.createElement('div');
      header.className = 'modal-header';
      const titleWrap = document.createElement('div');
      titleWrap.className = 'modal-title';
      const h3 = document.createElement('h3');
      h3.textContent = i18n.t('modals.importOptions');
      titleWrap.appendChild(h3);
      header.appendChild(titleWrap);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close';
      closeBtn.innerHTML = '<i class="fas fa-times"></i>';
      header.appendChild(closeBtn);
      content.appendChild(header);

      // body
      const body = document.createElement('div');
      body.className = 'modal-body';

      const form = document.createElement('div');
      form.className = 'form-block';
      const types = ['notes', 'folders', 'reminders', 'notifications', 'todos', 'settings'];
      const inputs = {};
      types.forEach((t) => {
        if (!available[t]) return;
        const row = document.createElement('div');
        row.className = 'form-check';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.id = 'imp_opt_' + t;
        cb.className = 'form-checkbox';
        inputs[t] = cb;
        const lbl = document.createElement('label');
        lbl.setAttribute('for', cb.id);
        lbl.textContent = i18n.t(
          {
            notes: 'nav.notes',
            folders: 'modals.folders',
            reminders: 'nav.reminders',
            notifications: 'nav.notifications',
            todos: 'nav.todos',
            settings: 'nav.settings',
          }[t]
        );
        row.appendChild(cb);
        row.appendChild(lbl);
        form.appendChild(row);
      });

      const mergeRow = document.createElement('div');
      mergeRow.className = 'form-check';
      const mergeToggle = document.createElement('input');
      mergeToggle.type = 'checkbox';
      mergeToggle.checked = true;
      mergeToggle.id = 'imp_opt_merge';
      mergeToggle.className = 'form-checkbox';
      const mergeLabel = document.createElement('label');
      mergeLabel.setAttribute('for', mergeToggle.id);
      mergeLabel.textContent = i18n.t('modals.mergeWithExisting');
      mergeRow.appendChild(mergeToggle);
      mergeRow.appendChild(mergeLabel);

      body.appendChild(form);
      body.appendChild(mergeRow);
      content.appendChild(body);

      // footer
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = i18n.t('buttons.cancel');
      const okBtn = document.createElement('button');
      okBtn.className = 'btn btn-primary';
      okBtn.textContent = i18n.t('buttons.import');
      footer.appendChild(cancelBtn);
      footer.appendChild(okBtn);
      content.appendChild(footer);

      modal.appendChild(content);
      document.body.appendChild(modal);

      const cleanup = () => {
        try {
          document.body.removeChild(modal);
        } catch (e) {}
      };

      closeBtn.addEventListener('click', () => {
        cleanup();
        resolve(null);
      });
      modal.cancel = () => {
        cleanup();
        resolve(null);
      };
      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(null);
      });
      okBtn.addEventListener('click', () => {
        const result = {
          merge: mergeToggle.checked,
          notes: !!(inputs.notes && inputs.notes.checked),
          folders: !!(inputs.folders && inputs.folders.checked),
          reminders: !!(inputs.reminders && inputs.reminders.checked),
          notifications: !!(inputs.notifications && inputs.notifications.checked),
          todos: !!(inputs.todos && inputs.todos.checked),
          settings: !!(inputs.settings && inputs.settings.checked),
        };
        cleanup();
        resolve(result);
      });
    });
  }

  // ============ Automatic backups ============
  // The daily copies the app keeps by itself, listed in Settings > Data with a way back to each

  async renderAutoBackups() {
    const list = this.autoBackupsList;
    if (!list) return;
    let backups = [];
    try {
      backups = await window.electronAPI.backups.list();
    } catch (err) {
      console.warn('Listing the backups failed:', err);
    }
    list.innerHTML = '';
    if (!backups.length) {
      const empty = document.createElement('div');
      empty.className = 'setting-item auto-backup-empty';
      empty.textContent = i18n.t('autoBackup.empty');
      list.appendChild(empty);
      return;
    }
    const locale = this.getLocale();
    backups.forEach((backup) => {
      const beforeRestore = backup.id === 'before-restore';
      const title = beforeRestore
        ? i18n.t('autoBackup.beforeRestore')
        : new Date(`${backup.id}T00:00`).toLocaleDateString(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
      const when =
        beforeRestore && backup.takenAt
          ? new Date(backup.takenAt).toLocaleString(locale, {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })
          : i18n.t('autoBackup.dayStart');
      const row = document.createElement('div');
      row.className = 'setting-item auto-backup';
      row.dataset.backupId = backup.id;
      row.innerHTML = `<div class="setting-info"><label></label><small></small></div><button class="btn-tinted btn-small auto-backup-restore"><i class="fas fa-clock-rotate-left"></i> <span></span></button>`;
      row.querySelector('label').textContent = title;
      row.querySelector('small').textContent = [
        when,
        i18n.t('autoBackup.notes', { count: backup.notes }),
        i18n.t('autoBackup.folders', { count: backup.folders }),
      ].join(' · ');
      row.querySelector('button span').textContent = i18n.t('autoBackup.restore');
      row
        .querySelector('button')
        .addEventListener('click', () => this.restoreAutoBackup(backup.id, title));
      list.appendChild(row);
    });
  }

  // After confirming: the backup goes back in place and the app starts again on it
  restoreAutoBackup(id, title) {
    this.showConfirm(i18n.t('autoBackup.confirm', { when: title }), async () => {
      this.cancelAutoSave?.();
      try {
        await window.electronAPI.backups.restore(id);
      } catch (err) {
        console.error('Restoring the backup failed:', err);
        this.showNotification(i18n.t('autoBackup.failed'), 'error');
        return;
      }
      // Nothing in memory may be written over the restored data before the reload
      this.isRestoring = true;
      try {
        sessionStorage.setItem('capnote-restored', title);
      } catch {
        // the message after the reload is only a courtesy
      }
      window.location.reload();
    });
  }

  // After a restore's reload: say what was restored
  announceRestore() {
    let title;
    try {
      title = sessionStorage.getItem('capnote-restored');
      sessionStorage.removeItem('capnote-restored');
    } catch {
      return;
    }
    if (title) this.showNotification(i18n.t('autoBackup.restored', { when: title }), 'success');
  }
}
