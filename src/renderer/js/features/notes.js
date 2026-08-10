// Note lifecycle: create, open, save, duplicate, delete, favorite, pin and history

import { HISTORY_MERGE_MS, HISTORY_LIMIT } from '../constants.js';
import { i18n } from '../i18n.js';

export class NotesFeature {
  saveLastViewedNote(noteId) {
    if (this.settings.lastViewedNoteId !== noteId) this.setSetting('lastViewedNoteId', noteId);
  }

  getLastViewedNote() {
    return this.settings.lastViewedNoteId;
  }

  loadLastViewedNote() {
    if (this.notes.length === 0) {
      this.showWelcome();
      return;
    }

    const lastViewedNoteId = this.getLastViewedNote();

    if (lastViewedNoteId && this.notes.length > 0) {
      // Find the note with the saved ID
      const lastNote = this.notes.find((note) => note.id === lastViewedNoteId);

      if (lastNote) {
        // Open the last viewed note
        this.openNote(lastNote);
        return;
      }
    }

    // If no last viewed note or note not found, open the first note
    if (this.notes.length > 0) {
      this.openNote(this.notes[0]);
    }
  }

  openNote(note) {
    // Auto-lock the current note if it was unlocked and is locked
    this.autoLockCurrentNote();

    this.currentNote = note;
    this.showViewer();
    this.displayNote(note);
    this.setActiveNoteInList(this.currentNote.id); // Only update active class
  }

  createNewNote() {
    // Auto-lock the current note if it was unlocked and is locked
    this.autoLockCurrentNote();

    // Ensure emoji panel is closed when leaving the current note
    try {
      this.hideEmojiPanel();
    } catch (e) {}
    // Remember where we came from so cancelling the new note can go back there
    this.noteBeforeNew =
      this.currentNote && this.notes.includes(this.currentNote) ? this.currentNote : null;
    this.currentNote = {
      id: this.newId(),
      title: '',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      mood: null,
      weather: null,
      tags: [],
      wordCount: 0,
      charCount: 0,
      isLocked: false,
      folderId: null,
      formatting: {
        ...this.getDefaultFormatting(),
        textAlign: 'left',
      },
    };

    // initialize history
    this.currentNote.history = [{ type: 'created', ts: this.currentNote.createdAt }];

    // Save last viewed note (new note)
    this.saveLastViewedNote(this.currentNote.id);

    // Clear active note in list when creating new note
    this.clearActiveNoteInList();

    this.showEditor();
    this.clearEditor();
    this.updateCurrentDate();
    this.noteTitle.focus();

    // Reset save button state for new note
    this.originalNoteState = this.getCurrentNoteContent();
    this.lastSavedContent = this.getCurrentNoteContent();
    this.isAutoSaved = false;
    this.updateSaveButtonState();

    // Update favorite button state for new unsaved note
    this.updateFavoriteButtons();
    // Renk inputlarını sabitle
    if (this.textColor) this.textColor.value = '#000000';
    if (this.bgColor) this.bgColor.value = '#ffffff';
  }

  // Store currentNote in the notes array while keeping one shared object,
  // so later edits (favorite, pin, lock) always reach what gets persisted
  upsertCurrentNote() {
    const index = this.notes.findIndex((note) => note.id === this.currentNote.id);
    if (index === -1) {
      this.notes.unshift(this.currentNote);
      return;
    }
    if (this.notes[index] !== this.currentNote) {
      this.notes[index] = Object.assign(this.notes[index], this.currentNote);
      this.currentNote = this.notes[index];
    }
  }

  saveNote(silent = false) {
    if (!this.currentNote) return;

    // Sync checkbox states before saving
    this.syncCheckboxStates();

    const title = this.noteTitle.value.trim() || i18n.t('messages.untitledNote');
    // If markdown editor is visible, save raw markdown; otherwise save HTML from rich editor
    // If the markdown editor is visible (editing markdown), save raw markdown; otherwise save HTML from rich editor
    const isMarkdownMode = this.markdownEditor && !this.markdownEditor.classList.contains('hidden');
    const content = isMarkdownMode ? this.markdownEditor.value : this.richEditor.innerHTML;

    // Saved notes get a history entry when their title or text actually changed
    const isStored = this.notes.includes(this.currentNote);
    if (isStored && (this.currentNote.title !== title || this.currentNote.content !== content)) {
      this.recordHistory(this.currentNote);
    }

    this.currentNote.title = title;
    this.currentNote.content = content;
    this.currentNote.attachments = this.extractUploadNames(content);
    this.currentNote.isMarkdown = !!isMarkdownMode;
    const nowIso = new Date().toISOString();
    this.currentNote.updatedAt = nowIso;
    // Update UI lists to reflect changes. Keep it simple and robust.
    try {
      this.updateNotesList();
      this.updateFoldersList();
      if (this.currentNote && this.currentNote.id) {
        this.updateActionButtonStates(this.currentNote.id);
      }
    } catch (e) {
      // If anything goes wrong, ensure full refresh
      this.updateNotesList();
      this.updateFoldersList();
    }
    this.currentNote.mood = this.selectedMood;
    this.currentNote.weather = this.selectedWeather;
    // Ensure accurate word/char counts are stored (handle multiline and HTML)
    const counts = this.countWordsAndCharsFromHtml(content);
    this.currentNote.wordCount = counts.words;
    this.currentNote.charCount = counts.chars;
    this.currentNote.tags = [...this.tags];
    this.currentNote.formatting = this.getEditorFormatting();

    // Var olan notu güncelle veya yeni not ekle
    this.upsertCurrentNote();

    this.saveNotes();
    if (this.currentNote.isLocked) this.resealNote(this.currentNote);
    this.markAsSaved(); // Mark as saved to disable save button

    // Update favorite button state after saving
    this.updateFavoriteButtons();

    if (!silent) {
      this.showNotification(i18n.t('messages.noteSaved'), 'success');
      this.showViewer();
      this.displayNote(this.currentNote);
    }

    this.updateNotesList();
    this.updateStats();
  }

  async editCurrentNote() {
    if (!this.currentNote) return;
    // Editing a locked note requires the password, same as viewing it
    if (this.isNoteLockedForView(this.currentNote)) {
      const unlocked = await this.unlockNoteForViewing(this.currentNote);
      if (!unlocked) return;
    }

    this.originalNoteState = {
      title: this.currentNote.title,
      content: this.currentNote.content,
      mood: this.currentNote.mood,
      weather: this.currentNote.weather,
      tags: [...(this.currentNote.tags || [])],
      formatting: { ...(this.currentNote.formatting || this.getDefaultFormatting()) },
    };

    // Save last viewed note when editing
    this.saveLastViewedNote(this.currentNote.id);

    this.showEditor();
    this.loadNoteInEditor(this.currentNote);
  }

  cancelEdit() {
    // A brand-new note that was never saved must not be shown as if it existed
    if (this.currentNote && !this.notes.includes(this.currentNote)) {
      const previous =
        this.noteBeforeNew && this.notes.includes(this.noteBeforeNew) ? this.noteBeforeNew : null;
      this.currentNote = null;
      this.noteBeforeNew = null;
      if (previous) {
        this.openNote(previous);
      } else if (this.notes.length > 0) {
        this.openNote(this.notes[0]);
      } else {
        this.showWelcome();
      }
      return;
    }

    if (this.currentNote) {
      this.showViewer();
      this.displayNote(this.currentNote);
    } else {
      this.showWelcome();
    }
  }

  deleteCurrentNote() {
    if (!this.currentNote) return;
    this.deleteNoteById(this.currentNote.id);
  }

  duplicateNote() {
    if (!this.currentNote || this.isNoteLockedForView(this.currentNote)) return;

    const duplicate = {
      ...this.currentNote,
      id: this.newId(),
      title: this.currentNote.title + i18n.t('messages.noteCopySuffix'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false, // Kopyalanan not sabitlenmiş olmasın
      isLocked: false, // Kopyalanan not kilitli olmasın
      isFavorite: false, // Kopyalanan not favorilerde olmasın
    };
    delete duplicate.encrypted;

    this.notes.unshift(duplicate);
    this.saveNotes();
    this.updateNotesList();
    this.updateStats();
    this.showNotification(i18n.t('messages.noteCopied'), 'success');

    this.selectNote(duplicate);
  }

  /**
   * Favori butonlarını günceller
   */
  updateFavoriteButtons() {
    const isFavorite = this.currentNote?.isFavorite;

    // Only update the favorite view button since favoriteBtn is only in viewer mode
    if (this.favoriteViewBtn) {
      const icon = this.favoriteViewBtn.querySelector('i');
      icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
      this.favoriteViewBtn.classList.toggle('favorited', isFavorite);
    }
  }

  // Toggle favorite from the viewer action button
  async toggleFavoriteView() {
    if (!this.currentNote) return;

    // Mirror behavior of other favorite toggles
    this.currentNote.isFavorite = !this.currentNote.isFavorite;
    this.currentNote.updatedAt = new Date().toISOString();

    try {
      await this.saveNotes();
    } catch (e) {
      // ignore save errors for UI responsiveness; still update UI
    }

    // Update viewer favorite UI
    this.updateFavoriteButtons();

    // Update any other instances of this note's buttons and lists
    this.updateActionButtonStates(this.currentNote.id);
    if (this.currentNote.folderId) {
      this.updateSpecificFolder(this.currentNote.folderId);
    } else {
      this.updateNotesList();
    }

    const message = this.currentNote.isFavorite
      ? i18n.t('messages.addedToFavorites')
      : i18n.t('messages.removedFromFavorites');
    this.showNotification(message, 'success');
  }

  selectNote(note) {
    // Auto-lock the current note if it was unlocked and is locked
    this.autoLockCurrentNote();

    // Check if note is locked
    if (this.isNoteLockedForView(note)) {
      this.unlockNoteForViewing(note);
      return;
    }

    this.currentNote = note;
    this.originalNoteState = {
      title: note.title,
      content: note.content,
      mood: note.mood,
      weather: note.weather,
      tags: [...(note.tags || [])],
      formatting: { ...(note.formatting || this.getDefaultFormatting()) },
    };

    // Save last viewed note
    this.saveLastViewedNote(note.id);

    // Show viewer mode and display note
    this.showViewer();
    this.displayNote(note);
    this.setActiveNoteInList(this.currentNote.id); // Only update active class
  }

  recordHistory(note) {
    const now = new Date();
    note.history = Array.isArray(note.history) ? note.history : [];
    const last = note.history[note.history.length - 1];
    if (last && last.type === 'updated' && now - new Date(last.ts) < HISTORY_MERGE_MS) {
      last.ts = now.toISOString();
    } else {
      note.history.push({ type: 'updated', ts: now.toISOString() });
    }
    // Keep the creation entry and the most recent updates
    const created = note.history.filter((h) => h.type === 'created');
    const updates = note.history.filter((h) => h.type !== 'created').slice(-HISTORY_LIMIT);
    note.history = [...created, ...updates];
  }

  deleteNoteById(noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;

    if (!this.settings.confirmDelete) {
      this.performNoteDeletion(note);
      return;
    }
    this.showConfirm(`"${note.title}" ${i18n.t('messages.confirmDelete')}`, () =>
      this.performNoteDeletion(note)
    );
  }

  performNoteDeletion(note) {
    this.notes = this.notes.filter((n) => n !== note);
    this.saveNotes();
    this.removeNoteReferences([note.id]);
    this.unlockedNotes.delete(String(note.id));

    this.updateNotesList();
    this.updateFoldersList();
    this.updateStats();

    // If the deleted note was open, follow the "on note delete" setting
    if (this.currentNote && this.currentNote.id === note.id) {
      this.currentNote = null;
      if (this.settings.onNoteDelete !== 'home' && this.notes.length > 0) {
        this.openNote(this.notes[0]);
      } else {
        this.showWelcome();
      }
    }

    this.showNotification(i18n.t('messages.noteDeleted'), 'success');
  }

  // Remove reminders and notifications that point at deleted notes
  removeNoteReferences(noteIds) {
    const ids = new Set(Array.from(noteIds, (id) => String(id)));
    if (ids.size === 0) return;
    const keep = (item) =>
      item.noteId === null || item.noteId === undefined || !ids.has(String(item.noteId));

    this.reminders = this.reminders.filter(keep);
    this.notifications = this.notifications.filter(keep);
    this.saveReminders();
    this.saveNotifications();

    this.updateRemindersView();
    this.updateNotificationsView();
    this.updateNoteRemindersDisplay();
    this.updateActiveRemindersCount();
    this.updateActiveNotificationsCount();
  }

  // Action button functions
  async toggleFavorite(noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;

    note.isFavorite = !note.isFavorite;
    note.updatedAt = new Date().toISOString();

    await this.saveNotes();

    // Update all instances of this note's action buttons
    this.updateActionButtonStates(noteId);

    // Only update the specific folder if note is in a folder, otherwise update main list
    if (note.folderId) {
      this.updateSpecificFolder(note.folderId);
    } else {
      this.updateNotesList();
    }
    // Keep the current filter selected after toggling metadata

    const message = note.isFavorite
      ? i18n.t('messages.addedToFavorites')
      : i18n.t('messages.removedFromFavorites');
    this.showNotification(message, 'success');
  }

  async togglePin(noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;

    // If trying to pin and already 3 notes are pinned, block and notify
    if (!note.isPinned) {
      const pinnedCount = this.notes.filter((n) => n.isPinned).length;
      const maxPinned = this.settings.maxPinnedNotes;
      if (pinnedCount >= maxPinned) {
        this.showNotification(
          i18n.t('messages.maxPinnedNotes').replace('{count}', maxPinned),
          'error'
        );
        return;
      }
    }

    note.isPinned = !note.isPinned;
    note.updatedAt = new Date().toISOString();

    await this.saveNotes();

    // Update all instances of this note's action buttons
    this.updateActionButtonStates(noteId);

    // Only update the specific folder if note is in a folder, otherwise update main list
    if (note.folderId) {
      this.updateSpecificFolder(note.folderId);
    } else {
      this.updateNotesList();
    }

    // If viewing favorites, refresh it to reflect pin changes where applicable
    if (this.currentFilter === 'favorites') this.updateNotesList();

    const message = note.isPinned ? i18n.t('messages.notePinned') : i18n.t('messages.noteUnpinned');
    this.showNotification(message, 'success');
  }

  updateActionButtonStates(noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;

    // Find all instances of this note in DOM (main list and folders)
    const noteElements = document.querySelectorAll(`[data-note-id="${noteId}"]`);

    noteElements.forEach((noteElement) => {
      const favoriteBtn = noteElement.querySelector('.favorite-btn');
      const pinBtn = noteElement.querySelector('.pin-btn');
      const lockBtn = noteElement.querySelector('.lock-btn');

      // Update favorite button
      if (favoriteBtn) {
        if (note.isFavorite) {
          favoriteBtn.classList.add('favorited');
        } else {
          favoriteBtn.classList.remove('favorited');
        }
      }

      // Update pin button
      if (pinBtn) {
        if (note.isPinned) {
          pinBtn.classList.add('pinned');
        } else {
          pinBtn.classList.remove('pinned');
        }
      }

      // Update lock button
      if (lockBtn) {
        if (note.isLocked) {
          lockBtn.classList.add('locked');
        } else {
          lockBtn.classList.remove('locked');
        }
      }
    });
  }

  // Save/cancel in the editor and the action buttons of the viewer
  setupNoteActionEvents() {
    this.saveNoteBtn.addEventListener('click', () => this.saveNote());

    this.cancelNoteBtn.addEventListener('click', () => this.cancelEdit());

    this.editNoteBtn.addEventListener('click', () => this.editCurrentNote());

    this.deleteNoteBtn.addEventListener('click', () => this.deleteCurrentNote());

    this.favoriteViewBtn.addEventListener('click', () => this.toggleFavoriteView());

    this.duplicateNoteBtn.addEventListener('click', () => this.duplicateNote());

    this.exportNoteBtn.addEventListener('click', () => this.showExportModal());
  }
}
