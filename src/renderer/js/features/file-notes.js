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
      this.addExtensionToTitle(note);
    } else {
      const now = new Date().toISOString();
      const counts = this.countWordsAndCharsFromHtml(this.escapeHtml(file.content));
      note = {
        id: this.newId(),
        // The file's name as it is, with its extension (index.html, not index)
        title: file.name,
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

  // File notes made before titles kept the extension are titled with the file's name without it;
  // they get the full name (a title the user changed stays as it is). True when it changed.
  addExtensionToTitle(note) {
    const name = this.fileName(note);
    if (note.title !== name.replace(/\.[^.]+$/, '') || note.title === name) return false;
    note.title = name;
    return true;
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

  // The files of file notes being deleted go to the Recycle Bin (a file already gone is fine)
  async trashNoteFiles(notes) {
    const api = window.electronAPI?.files;
    if (!api || !notes.length) return;
    const results = await Promise.all(notes.map((n) => api.trash(n.filePath)));
    const failed = notes.filter((n, i) => !results[i]?.ok && results[i]?.error !== 'missing');
    if (failed.length) {
      this.showNotification(
        i18n.t('files.trashFailed', { name: this.fileName(failed[0]) }),
        'error'
      );
    } else if (notes.length === 1) {
      this.showNotification(i18n.t('files.trashed', { name: this.fileName(notes[0]) }), 'success');
    } else {
      this.showNotification(i18n.t('files.trashedMany', { count: notes.length }), 'success');
    }
  }

  revealFileNote(note = this.currentNote) {
    if (note?.filePath) window.electronAPI?.files?.reveal(note.filePath);
  }

  // Files dragged from the desktop onto the notes list open as file notes. Only a drag that carries
  // files is taken here; moving notes and folders within the list goes on as before.
  setupFileDrop() {
    const area = this.sidebarContent;
    const list = document.getElementById('notesListContainer');
    if (!area || !list) return;
    const carriesFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
    const clear = () => list.classList.remove('drag-over');
    // Both are taken: the browser picks the drop target on dragenter, so over a note row (which
    // has drag handlers of its own) the drop would otherwise not come
    const accept = (e) => {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      list.dataset.dropLabel = i18n.t('files.dropToOpen');
      list.classList.add('drag-over');
    };
    area.addEventListener('dragenter', accept, true);
    area.addEventListener('dragover', accept, true);
    area.addEventListener('dragleave', (e) => {
      if (carriesFiles(e) && !area.contains(e.relatedTarget)) clear();
    });
    area.addEventListener(
      'drop',
      async (e) => {
        if (!carriesFiles(e)) return;
        e.preventDefault();
        e.stopPropagation();
        clear();
        const files = [...(e.dataTransfer.files || [])];
        if (!files.length) return;
        const result = await window.electronAPI.files.openDropped(files);
        if (result?.unsupported?.length) {
          this.showNotification(
            i18n.t('files.unsupported', { name: result.unsupported.join(', ') }),
            'warning'
          );
        }
      },
      true
    );
  }

  async setupFileNotes() {
    const api = window.electronAPI?.files;
    if (!api) return;
    // Titles of earlier file notes get their extension
    const renamed = this.notes.filter((n) => this.isFileNote(n) && this.addExtensionToTitle(n));
    if (renamed.length) {
      this.saveNotes();
      this.updateNotesList();
      if (this.currentNote && renamed.includes(this.currentNote) && this.isViewerOpen()) {
        this.displayNote(this.currentNote);
      }
    }
    this.viewerFile?.addEventListener('click', () => this.revealFileNote());
    api.onOpen((file) => this.openExternalFile(file));
    this.setupFileDrop();
    // The files Capnote was started on, once the page is ready
    const files = await api.takePending();
    (files || []).forEach((file) => this.openExternalFile(file));
  }
}
