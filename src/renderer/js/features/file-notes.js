// File notes: a .md, .txt or .html file opened with "Edit with Capnote" becomes a note linked to the
// file. Its text is edited as it is in the file (in the plain text editor, so nothing is lost or
// reformatted), saving the note writes the file back, and opening the note reads the file again so
// changes made elsewhere show. The main process does the reading and writing (src/main/files.js).
//
// A file note keeps: filePath, fileKind ('md', 'txt' or 'html') and fileMtime (the file's time when
// it was last read or written, to notice changes made elsewhere before overwriting them).

import { i18n } from '../i18n.js';

const KINDS = { md: 'md', markdown: 'md', txt: 'txt', html: 'html', htm: 'html' };

export class FileNotesFeature {
  isFileNote(note) {
    return !!note?.filePath;
  }

  fileNoteFor(filePath) {
    const key = String(filePath).toLowerCase();
    return this.notes.find((n) => n.filePath && n.filePath.toLowerCase() === key);
  }

  fileName(note) {
    return String(note.filePath).split(/[\\/]/).pop();
  }

  // The icon of a file note in the list: Markdown, code for HTML, a plain page for text
  fileNoteIcon(note) {
    return { md: 'fab fa-markdown', html: 'fas fa-file-code' }[note.fileKind] || 'fas fa-file';
  }

  // How a file note shows in the viewer: Markdown rendered, an HTML page's body rendered (cleaned),
  // plain text as it is
  fileNoteViewerHtml(note) {
    if (note.fileKind === 'html') {
      const body = new DOMParser().parseFromString(note.content || '', 'text/html').body;
      return this.sanitizeHtml(body.innerHTML);
    }
    if (note.fileKind === 'txt') {
      return `<div class="plain-text">${this.escapeHtml(note.content || '')}</div>`;
    }
    return null;
  }

  // A file sent by the main process: a new file note, or the one this file already has, then open
  // in the editor, as a text editor opens a file
  openExternalFile(file) {
    if (!file?.ok) {
      const name = String(file?.path || '')
        .split(/[\\/]/)
        .pop();
      const key = file?.error === 'too-large' ? 'files.tooLarge' : 'files.openFailed';
      this.showNotification(i18n.t(key, { name }), 'error');
      return;
    }
    const kind = KINDS[file.ext] || 'txt';
    let note = this.fileNoteFor(file.path);
    if (note) {
      note.content = file.content;
      note.fileMtime = file.mtimeMs;
      note.fileKind = kind;
      note.isMarkdown = true;
      if (note.isArchived) note.isArchived = false;
    } else {
      const now = new Date().toISOString();
      const counts = this.countWordsAndCharsFromHtml(this.escapeHtml(file.content));
      note = {
        id: this.newId(),
        title: file.name.replace(/\.[^.]+$/, ''),
        content: file.content,
        isMarkdown: true,
        filePath: file.path,
        fileKind: kind,
        fileMtime: file.mtimeMs,
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
        mood: null,
        weather: null,
        tags: [],
        wordCount: counts.words,
        charCount: counts.chars,
        isLocked: false,
        folderId: null,
        formatting: { ...this.getDefaultFormatting(), textAlign: 'left' },
        history: [{ type: 'created', ts: now }],
      };
      this.notes.unshift(note);
    }
    this.saveNotes();
    this.updateNotesList();
    this.updateFoldersList();
    this.updateStats();
    this.selectNote(note);
    this.editCurrentNote();
  }

  // Opening a file note reads its file again: changes made in another program show here
  async refreshFileNote(note) {
    const file = await window.electronAPI?.files?.read(note.filePath);
    if (!file?.ok) {
      if (file?.error === 'missing') {
        this.showNotification(i18n.t('files.missing', { name: this.fileName(note) }), 'warning');
      }
      return;
    }
    if (file.content === note.content && file.mtimeMs === note.fileMtime) return;
    note.content = file.content;
    note.fileMtime = file.mtimeMs;
    this.saveNotes();
    if (this.currentNote === note && this.isViewerOpen()) this.displayNote(note);
  }

  // Saving a file note writes its file. A file changed elsewhere since it was read is not
  // overwritten without asking.
  async writeFileNote(note, force = false) {
    const api = window.electronAPI?.files;
    if (!api || !note.filePath) return;
    const result = await api.write({
      path: note.filePath,
      content: note.content || '',
      mtimeMs: note.fileMtime,
      force,
    });
    const name = this.fileName(note);
    if (result?.ok) {
      note.fileMtime = result.mtimeMs;
      this.saveNotes();
      return;
    }
    if (result?.conflict) {
      // One question at a time: automatic saves meanwhile do not ask again
      if (!this.confirmModal.classList.contains('hidden')) return;
      this.showConfirm(i18n.t('files.conflict', { name }), () => this.writeFileNote(note, true));
      return;
    }
    this.showNotification(i18n.t('files.saveFailed', { name }), 'error');
  }

  revealFileNote(note = this.currentNote) {
    if (note?.filePath) window.electronAPI?.files?.reveal(note.filePath);
  }

  async setupFileNotes() {
    const api = window.electronAPI?.files;
    if (!api) return;
    this.viewerFile?.addEventListener('click', () => this.revealFileNote());
    api.onOpen((file) => this.openExternalFile(file));
    // The files Capnote was started on, once the page is ready
    const files = await api.takePending();
    (files || []).forEach((file) => this.openExternalFile(file));
  }
}
