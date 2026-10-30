// The archive: notes kept out of the note list (and its search and filters) without deleting
// them. They have a page of their own, open like any note and come back with "Unarchive".

import { i18n } from '../i18n.js';

export class ArchiveFeature {
  // Archive or bring back notes; an archived note is no longer pinned
  async setArchived(notes, archived) {
    if (!notes.length) return;
    notes.forEach((note) => {
      note.isArchived = archived;
      if (archived) note.isPinned = false;
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

  toggleArchive(noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (note) return this.setArchived([note], !note.isArchived);
  }

  showArchiveScreen() {
    this.showScreen('archive');
    this.renderArchiveScreen();
  }

  // The archived notes, the latest edited first: open one, or take it out of the archive
  renderArchiveScreen() {
    const list = this.archiveList;
    list.innerHTML = '';
    const notes = this.notes
      .filter((note) => note.isArchived)
      .sort((x, y) => new Date(y.updatedAt || y.createdAt) - new Date(x.updatedAt || x.createdAt));
    if (!notes.length) {
      list.innerHTML = `<div class="empty-state empty-state-large"><i class="fas fa-box-archive"></i><p>${i18n.t('archive.empty')}</p></div>`;
      return;
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
  }
}
