// Full data backup export and import

import { SCHEMA_VERSION, DEFAULT_SETTINGS, LOCAL_ONLY_SETTINGS } from '../constants.js';

export class BackupFeature {
  // New: export ALL data (notes, folders, reminders, notifications, settings)
  async exportAllData() {
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

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capnote-all-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showNotification(window.i18n.t('messages.dataExported'), 'success');
    // Refresh reminder/notification UI and counters in case data changed
    try {
      this.updateRemindersView();
    } catch (e) {}
    try {
      this.updateNotificationsView();
    } catch (e) {}
    try {
      this.updateActiveRemindersCount();
    } catch (e) {}
    try {
      this.updateActiveNotificationsCount();
    } catch (e) {}
  }

  // New: import ALL data and offer merge/replace behaviour
  importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        let data = JSON.parse(text || '{}');

        // Validate structure
        if (!data || typeof data !== 'object')
          throw new Error(window.i18n.t('messages.invalidFileFormat'));

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
          throw new Error(window.i18n.t('messages.backupTooNew'));
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
          this.showNotification(window.i18n.t('messages.importCancelled'), 'warning');
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
                n.createdAt === note.createdAt &&
                n.title === note.title &&
                n.content === note.content
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
            this.reminders.push(newR);
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
            this.notifications.push(newN);
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
            maxPinnedNotes: 'maxPinnedNotes',
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

        // Persist everything
        try {
          await this.saveFolders();
        } catch (e) {
          console.warn(e);
        }
        try {
          await this.saveNotes();
        } catch (e) {
          console.warn(e);
        }
        try {
          await this.saveReminders();
        } catch (e) {
          console.warn(e);
        }
        try {
          await this.saveNotifications();
        } catch (e) {
          console.warn(e);
        }
        await this.saveTodos();

        // Reload UI/state
        this.loadSettings();
        this.updateFoldersList();
        this.updateNotesList();
        this.updateFolderNotes();
        // Refresh reminders/notifications UI and counters
        try {
          this.updateRemindersView();
        } catch (e) {}
        try {
          this.updateNotificationsView();
        } catch (e) {}
        try {
          this.updateActiveRemindersCount();
        } catch (e) {}
        try {
          this.updateActiveNotificationsCount();
        } catch (e) {}
        this.renderTodosSections();
        this.updateTodosCount();

        this.updateStats();

        if (skippedDuplicates > 0)
          console.info(`Import skipped ${skippedDuplicates} duplicate note(s)`);
        this.showNotification(window.i18n.t('messages.dataImported'), 'success');
        this.settingsModal.classList.remove('show');
        this.settingsModal.classList.add('hidden');
      } catch (err) {
        console.error('Import all data error', err);
        this.showNotification(
          `${window.i18n.t('messages.dataImportError')} ${err.message || err}`,
          'error'
        );
      }
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  // Show a small modal dialog letting user pick which types to import and merge vs replace
  showImportOptionsDialog(available) {
    return new Promise((resolve) => {
      // create modal element using app modal classes so styling matches
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.display = 'flex';
      const content = document.createElement('div');
      content.className = 'modal-content import-modal';

      // header
      const header = document.createElement('div');
      header.className = 'modal-header';
      const titleWrap = document.createElement('div');
      titleWrap.className = 'modal-title';
      const h3 = document.createElement('h3');
      h3.textContent = window.i18n.t('modals.importOptions');
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
        row.className = 'form-group';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.id = 'imp_opt_' + t;
        cb.className = 'form-checkbox';
        inputs[t] = cb;
        const lbl = document.createElement('label');
        lbl.setAttribute('for', cb.id);
        lbl.textContent = window.i18n.t(
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
      mergeRow.className = 'form-group';
      const mergeToggle = document.createElement('input');
      mergeToggle.type = 'checkbox';
      mergeToggle.checked = true;
      mergeToggle.id = 'imp_opt_merge';
      mergeToggle.className = 'form-checkbox';
      const mergeLabel = document.createElement('label');
      mergeLabel.setAttribute('for', mergeToggle.id);
      mergeLabel.textContent = window.i18n.t('modals.mergeWithExisting');
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
      cancelBtn.textContent = window.i18n.t('buttons.cancel');
      const okBtn = document.createElement('button');
      okBtn.className = 'btn btn-primary';
      okBtn.textContent = window.i18n.t('buttons.import');
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
}
