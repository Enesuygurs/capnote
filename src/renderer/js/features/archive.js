// The archive: notes and folders kept out of the note list (and its search and filters) without
// deleting them. They have a page of their own, open like any note and come back with "Unarchive".
// An archived folder goes with the folders and notes in it; its notes keep archivedWithFolder, so
// taking the folder out brings back those notes (and not ones archived on their own).

import { i18n } from '../i18n.js';

export class ArchiveFeature {
  // Archive or bring back notes; an archived note is no longer pinned
  async setArchived(notes, archived) {
    // A file note is not archived (it is its file, kept where the file is)
    if (archived) notes = notes.filter((n) => !this.isFileNote(n));
    if (!notes.length) return;
    notes.forEach((note) => {
      note.isArchived = archived;
      if (archived) this.setPinned(note, false);
      if (!archived) {
        delete note.archivedWithFolder;
        // Its folder is still in the archive: it comes back to the top of the list
        if (note.folderId && this.isFolderArchived(note.folderId)) {
          note.folderId = null;
          delete note.order;
        }
      }
    });
    await this.saveNotes();
    this.updateNotesList();
    this.updateFoldersList();
    this.updateStats();
    if (!this.archiveScreen.classList.contains('hidden')) this.renderArchiveScreen();
    this.updateArchiveView();
    this.showNotification(
      i18n.t(archived ? 'archive.archived' : 'archive.unarchived', { count: notes.length }),
      'success'
    );
  }

  // The folder or one it is in is archived
  isFolderArchived(folderId) {
    return this.folderChain(folderId).some((f) => f.isArchived);
  }

  async archiveFolder(folder) {
    if (!folder || folder.isArchived || this.blockedByFolderLock(folder.id)) return;
    const inside = new Set([folder.id, ...this.folderDescendantIds(folder.id)]);
    this.notes.forEach((note) => {
      if (!note.folderId || !inside.has(note.folderId) || note.isArchived) return;
      note.isArchived = true;
      note.archivedWithFolder = folder.id;
      this.setPinned(note, false);
    });
    if (folder.isPinned) this.setPinned(folder, false);
    folder.isArchived = true;
    folder.archivedAt = new Date().toISOString();
    await this.saveFolders();
    await this.saveNotes();
    this.afterArchiveChange();
    this.showNotification(
      i18n.t('archive.folderArchived', { name: this.folderDisplayName(folder) }),
      'success'
    );
  }

  async unarchiveFolder(folder) {
    if (!folder?.isArchived) return;
    folder.isArchived = false;
    delete folder.archivedAt;
    // In a folder that is still archived: it comes back to the top of the list
    if (this.folderParentId(folder) && this.isFolderArchived(this.folderParentId(folder))) {
      delete folder.parentId;
      delete folder.order;
    }
    this.notes.forEach((note) => {
      if (note.archivedWithFolder !== folder.id) return;
      note.isArchived = false;
      delete note.archivedWithFolder;
    });
    await this.saveFolders();
    await this.saveNotes();
    this.afterArchiveChange();
    this.showNotification(
      i18n.t('archive.folderUnarchived', { name: this.folderDisplayName(folder) }),
      'success'
    );
  }

  afterArchiveChange() {
    this.updateNotesList();
    this.updateFoldersList();
    this.updateStats();
    if (!this.archiveScreen.classList.contains('hidden')) this.renderArchiveScreen();
    this.updateArchiveView();
  }

  toggleArchive(noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (note) return this.setArchived([note], !note.isArchived);
  }

  showArchiveScreen() {
    this.showScreen('archive');
    this.renderArchiveScreen();
  }

  // The archived folders (each with its notes), then the notes archived on their own, the latest
  // first: open one, or take it out of the archive
  renderArchiveScreen() {
    const list = this.archiveList;
    list.innerHTML = '';
    // Folders archived themselves (not those inside an archived folder: they go with it)
    const folders = this.folders
      .filter(
        (f) =>
          f.isArchived && !(this.folderParentId(f) && this.isFolderArchived(this.folderParentId(f)))
      )
      .sort((x, y) => new Date(y.archivedAt || 0) - new Date(x.archivedAt || 0));
    const notes = this.notes
      .filter(
        (note) =>
          note.isArchived &&
          !this.isNoteHiddenByFolderLock(note) &&
          !(note.folderId && this.isFolderArchived(note.folderId))
      )
      .sort((x, y) => new Date(y.updatedAt || y.createdAt) - new Date(x.updatedAt || x.createdAt));
    if (!notes.length && !folders.length) {
      list.innerHTML = `<div class="empty-state empty-state-large"><i class="fas fa-box-archive"></i><p>${i18n.t('archive.empty')}</p></div>`;
      return;
    }
    const heading = (key) => {
      const h = document.createElement('h3');
      h.className = 'panel-label archive-section';
      h.textContent = i18n.t(key);
      list.appendChild(h);
    };
    if (folders.length) {
      heading('archive.folders');
      folders.forEach((folder) => list.appendChild(this.archivedFolderCard(folder)));
      if (notes.length) heading('archive.notes');
    }
    notes.forEach((note) => {
      const folder = this.folders.find((f) => f.id === note.folderId);
      const card = document.createElement('div');
      card.className = 'list-card archive-note';
      card.dataset.noteId = note.id;
      card.innerHTML = `<div class="list-card-main"><div class="list-card-title"></div><div class="list-card-meta"></div></div><div class="list-card-actions"><button class="btn-secondary btn-small archive-open"><i class="fas fa-eye"></i> <span></span></button><button class="btn-tinted btn-small archive-restore"><i class="fas fa-box-open"></i> <span></span></button></div>`;
      card.querySelector('.list-card-title').textContent = this.displayTitle(note);
      card.querySelector('.list-card-meta').textContent = [
        new Date(note.updatedAt || note.createdAt).toLocaleDateString(this.getLocale(), {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        folder ? folder.name : null,
      ]
        .filter(Boolean)
        .join(' · ');
      card.querySelector('.archive-open span').textContent = i18n.t('messages.view');
      card.querySelector('.archive-restore span').textContent = i18n.t('archive.unarchive');
      card.querySelector('.archive-open').addEventListener('click', () => this.openNote(note));
      card
        .querySelector('.archive-restore')
        .addEventListener('click', () => this.setArchived([note], false));
      list.appendChild(card);
    });
  }

  // An archived folder: its name and color, how many notes, its notes to open, and the way back
  archivedFolderCard(folder) {
    const inside = new Set([folder.id, ...this.folderDescendantIds(folder.id)]);
    const notes = this.notes.filter((n) => n.folderId && inside.has(n.folderId));
    const card = document.createElement('div');
    card.className = 'list-card archive-folder';
    card.innerHTML = `<span class="archive-folder-icon"><i class="fas fa-folder"></i></span><div class="list-card-main"><div class="list-card-title"></div><div class="list-card-meta"></div><div class="archive-folder-notes"></div></div><div class="list-card-actions"><button class="btn-tinted btn-small archive-restore"><i class="fas fa-box-open"></i> <span></span></button></div>`;
    card.querySelector('.archive-folder-icon').style.color = this.safeColor(folder.color);
    card.querySelector('.list-card-title').textContent = this.folderDisplayName(folder);
    card.querySelector('.list-card-meta').textContent = [
      i18n.t('archive.folderMeta', { count: notes.length }),
      folder.archivedAt
        ? new Date(folder.archivedAt).toLocaleDateString(this.getLocale(), {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
    const box = card.querySelector('.archive-folder-notes');
    // Its notes, to open (not those of a locked folder, which cannot be read now)
    notes
      .filter((n) => !this.isNoteHiddenByFolderLock(n))
      .forEach((note) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip backlink';
        chip.innerHTML = '<i class="fas fa-file-lines"></i><span></span>';
        chip.querySelector('span').textContent = this.displayTitle(note);
        chip.addEventListener('click', () => this.openNote(note));
        box.appendChild(chip);
      });
    box.hidden = !box.children.length;
    card.querySelector('.archive-restore span').textContent = i18n.t('archive.unarchive');
    card
      .querySelector('.archive-restore')
      .addEventListener('click', () => this.unarchiveFolder(folder));
    return card;
  }

  // The viewer shows whether the open note is archived, and its button archives or brings it back
  updateArchiveView() {
    const archived = !!this.currentNote?.isArchived;
    this.viewerArchived?.classList.toggle('hidden', !archived);
    if (this.archiveViewBtn) {
      const label = i18n.t(archived ? 'archive.unarchive' : 'archive.archive');
      this.archiveViewBtn.title = label;
      this.archiveViewBtn.setAttribute('aria-label', label);
      this.archiveViewBtn.classList.toggle('active', archived);
      this.archiveViewBtn.querySelector('i').className =
        `fas ${archived ? 'fa-box-open' : 'fa-box-archive'}`;
    }
  }

  setupArchive() {
    this.archiveNavBtn?.addEventListener('click', () =>
      this.toggleScreenFromButton('archive', () => this.showArchiveScreen())
    );
    this.archiveViewBtn?.addEventListener('click', () => {
      if (this.currentNote) this.toggleArchive(this.currentNote.id);
    });
    this.archiveFolderMenuItem?.addEventListener('click', () => {
      const folder = this.folderById(this.selectedFolderId);
      this.hideContextMenu();
      this.archiveFolder(folder);
    });
  }
}
