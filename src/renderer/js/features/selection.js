// Selecting several notes and folders with Ctrl/Cmd+click, the menu for the selection,
// and renaming a note in place

import { i18n } from '../i18n.js';
import { MAX_PINNED_NOTES } from '../constants.js';

export class SelectionFeature {
  get hasSelection() {
    return this.selectedNoteIds.size + this.selectedFolderIds.size > 0;
  }

  // Ctrl/Cmd+click adds or removes a note or folder; the open note starts the selection
  toggleSelection(kind, id) {
    if (!this.hasSelection && this.currentNote && this.notes.includes(this.currentNote)) {
      this.selectedNoteIds.add(this.currentNote.id);
    }
    const set = kind === 'folder' ? this.selectedFolderIds : this.selectedNoteIds;
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.markSelection();
  }

  clearSelection() {
    if (!this.hasSelection) return;
    this.selectedNoteIds.clear();
    this.selectedFolderIds.clear();
    this.markSelection();
  }

  // Show the selection on the rows that are in the page now
  markSelection() {
    document.querySelectorAll('.note-item[data-note-id]').forEach((row) => {
      row.classList.toggle('is-selected', this.selectedNoteIds.has(row.dataset.noteId));
    });
    document.querySelectorAll('.folder-item[data-folder-id]').forEach((row) => {
      row.classList.toggle('is-selected', this.selectedFolderIds.has(row.dataset.folderId));
    });
  }

  // Right-click on a selected row of a selection of two or more opens the selection menu
  showSelectionMenuIfSelected(x, y, kind, id) {
    const set = kind === 'folder' ? this.selectedFolderIds : this.selectedNoteIds;
    const count = this.selectedNoteIds.size + this.selectedFolderIds.size;
    if (!set.has(id) || count < 2) {
      this.clearSelection();
      return false;
    }
    this.hideNoteContextMenu();
    this.hideContextMenu();

    const notes = this.notes.filter((n) => this.selectedNoteIds.has(n.id));
    const folders = this.folders.filter((f) => this.selectedFolderIds.has(f.id));
    const menu = this.selectionMenu;
    const item = (action) => menu.querySelector(`[data-action="${action}"]`);
    // Note actions only with notes in the selection, folder actions only with folders
    const allPinned = notes.length > 0 && notes.every((n) => n.isPinned);
    item('pin').hidden = notes.length === 0;
    item('pin').querySelector('span').textContent = i18n.t(
      allPinned ? 'messages.unpinNote' : 'messages.pinNote'
    );
    item('move').hidden = notes.length === 0 || this.folders.length === 0;
    const foldersPinned = folders.length > 0 && folders.every((f) => f.isPinned);
    item('pinFolders').hidden = folders.length === 0;
    item('pinFolders').querySelector('span').textContent = i18n.t(
      foldersPinned ? 'folders.unpin' : 'folders.pin'
    );
    // Favorite: adds all unless every selected note already is one
    const allFavorite = notes.length > 0 && notes.every((n) => n.isFavorite);
    item('favorite').hidden = notes.length === 0;
    item('favorite').querySelector('span').textContent = i18n.t(
      allFavorite ? 'messages.removeFromFavorites' : 'messages.addToFavorites'
    );
    item('unfile').hidden = !notes.some((n) => n.folderId);
    item('delete').querySelector('span').textContent = i18n.t('selection.delete', { count });

    this.positionMenu(menu, x, y);
    return true;
  }

  hideSelectionMenu() {
    this.selectionMenu?.classList.add('hidden');
    this.moveToFolderMenu?.classList.add('hidden');
  }

  // Pin the selected notes (or unpin them if all are pinned), up to the pin limit
  async pinSelection() {
    const notes = this.notes.filter((n) => this.selectedNoteIds.has(n.id));
    const value = !notes.every((n) => n.isPinned);
    if (value) {
      const free = MAX_PINNED_NOTES - this.notes.filter((n) => n.isPinned).length;
      const toPin = notes.filter((n) => !n.isPinned);
      if (toPin.length > free) {
        this.showNotification(
          i18n.t('messages.maxPinnedNotes').replace('{count}', MAX_PINNED_NOTES),
          'error'
        );
        return;
      }
      toPin.forEach((n) => {
        n.isPinned = true;
      });
    } else {
      notes.forEach((n) => {
        n.isPinned = false;
      });
    }
    await this.saveNotes();
    this.updateNotesList();
    this.updateFoldersList();
    this.markSelection();
    this.showNotification(
      i18n.t(value ? 'messages.notePinned' : 'messages.noteUnpinned'),
      'success'
    );
  }

  // The folder list for "Move to folder", opened beside the menu item
  showMoveToFolderMenu(item, noteIds) {
    const menu = this.moveToFolderMenu;
    menu.innerHTML = '';
    const notes = this.notes.filter((n) => noteIds.includes(n.id));
    this.folders.forEach((folder) => {
      const button = document.createElement('button');
      button.className = 'menu-item';
      // A folder all of these notes are in already is shown but cannot be picked
      button.disabled = notes.every((n) => n.folderId === folder.id);
      const icon = document.createElement('i');
      icon.className = 'fas fa-folder';
      icon.style.color = this.safeColor(folder.color);
      const label = document.createElement('span');
      label.textContent = folder.name;
      button.append(icon, label);
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideSelectionMenu();
        this.hideNoteContextMenu();
        this.moveNotesToFolder(noteIds, folder.id);
      });
      menu.appendChild(button);
    });
    const rect = item.getBoundingClientRect();
    this.positionMenu(menu, rect.right + 4, rect.top - 4);
    // No room on the right: open to the left of the menu
    if (menu.getBoundingClientRect().left < rect.right) {
      const width = menu.getBoundingClientRect().width;
      menu.style.left = Math.max(8, rect.left - width - 4) + 'px';
    }
  }

  async favoriteSelection() {
    const notes = this.notes.filter((n) => this.selectedNoteIds.has(n.id));
    const value = !notes.every((n) => n.isFavorite);
    notes.forEach((n) => {
      n.isFavorite = value;
    });
    await this.saveNotes();
    if (this.currentNote && this.selectedNoteIds.has(this.currentNote.id)) {
      this.updateFavoriteButtons();
    }
    this.updateNotesList();
    this.updateFoldersList();
    this.markSelection();
    this.showNotification(
      i18n.t(value ? 'messages.addedToFavorites' : 'messages.removedFromFavorites'),
      'success'
    );
  }

  async unfileSelection() {
    this.notes.forEach((n) => {
      if (this.selectedNoteIds.has(n.id) && n.folderId) {
        n.folderId = null;
        delete n.order;
      }
    });
    await this.saveNotes();
    this.updateNotesList();
    this.updateFoldersList();
    this.markSelection();
  }

  // Delete the selected notes and folders (with the notes inside them), after a confirmation
  deleteSelection() {
    const folderIds = new Set(this.selectedFolderIds);
    const noteIds = new Set(this.selectedNoteIds);
    const inFolders = this.notes.filter((n) => n.folderId && folderIds.has(n.folderId));
    inFolders.forEach((n) => noteIds.add(n.id));
    if (!noteIds.size && !folderIds.size) return;

    const message = folderIds.size
      ? i18n.t('selection.confirmDeleteWithFolders', {
          notes: this.selectedNoteIds.size,
          folders: folderIds.size,
        })
      : i18n.t('selection.confirmDeleteNotes', { count: noteIds.size });

    this.showConfirm(message, () => {
      this.notes = this.notes.filter((n) => !noteIds.has(n.id));
      this.folders = this.folders.filter((f) => !folderIds.has(f.id));
      this.removeNoteReferences([...noteIds]);
      noteIds.forEach((id) => this.unlockedNotes.delete(String(id)));
      this.selectedNoteIds.clear();
      this.selectedFolderIds.clear();
      this.saveNotes();
      this.saveFolders();
      this.updateNotesList();
      this.updateFoldersList();
      this.updateStats();

      if (this.currentNote && noteIds.has(this.currentNote.id)) {
        this.currentNote = null;
        const next = this.getSortedNotes(this.getFilteredNotes())[0] || this.notes[0];
        if (this.settings.onNoteDelete !== 'home' && next) this.openNote(next);
        else this.showWelcome();
      }
      this.showNotification(
        i18n.t('selection.deleted', { count: noteIds.size + folderIds.size }),
        'success'
      );
    });
  }

  // Double-click on a note row: edit its title right there. Enter or leaving the field saves,
  // Escape keeps the old title.
  startRenameNote(note, row) {
    if (this.isNoteLockedForView(note)) return;
    // The open editor already has the title field
    if (this.currentNote === note && this.isEditorOpen()) {
      this.noteTitle.focus();
      this.noteTitle.select();
      return;
    }
    // Opening the note on the first click may have redrawn the list
    if (!row.isConnected) row = document.querySelector(`.note-item[data-note-id="${note.id}"]`);
    const titleEl = row?.querySelector('.note-item-title');
    if (!titleEl || row.querySelector('.note-rename-input')) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-rename-input';
    input.value = note.title || '';
    input.maxLength = 200;
    titleEl.replaceWith(input);
    row.draggable = false;
    input.focus();
    input.select();

    let done = false;
    const finish = async (save) => {
      if (done) return;
      done = true;
      const title = input.value.trim();
      if (save && title && title !== note.title) {
        this.recordHistory(note);
        note.title = title;
        note.updatedAt = new Date().toISOString();
        await this.saveNotes();
        if (this.currentNote === note && this.isViewerOpen()) this.displayNote(note);
        this.updateRemindersView?.();
      }
      this.updateNotesList();
      this.updateFoldersList();
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') finish(true);
      else if (e.key === 'Escape') finish(false);
    });
    input.addEventListener('blur', () => finish(true));
    // Clicks in the field must not open the note or start a drag
    ['click', 'dblclick', 'mousedown'].forEach((type) =>
      input.addEventListener(type, (e) => e.stopPropagation())
    );
  }

  setupSelectionEvents() {
    this.selectionMenu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-action]');
      if (!item) return;
      e.stopPropagation();
      this.hideSelectionMenu();
      if (item.dataset.action === 'move') {
        this.showMoveToFolderMenu(item, [...this.selectedNoteIds]);
        return;
      }
      const actions = {
        favorite: () => this.favoriteSelection(),
        pin: () => this.pinSelection(),
        pinFolders: () => this.togglePinFolders([...this.selectedFolderIds]),
        unfile: () => this.unfileSelection(),
        delete: () => this.deleteSelection(),
      };
      actions[item.dataset.action]?.();
    });
    const close = () => this.hideSelectionMenu();
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#moveToFolderMenu')) close();
    });
    // A click on an empty part of the list clears the selection
    this.sidebarContent?.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) return;
      if (!e.target.closest('.note-item, .folder-item, .nav-section-header, .sort-dropdown')) {
        this.clearSelection();
      }
    });
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    this.sidebarContent?.addEventListener('scroll', close, { passive: true });
    document.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('.note-item, .folder-item')) close();
    });
  }
}
