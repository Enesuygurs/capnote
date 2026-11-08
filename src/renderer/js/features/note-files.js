// Files attached to a note: an "Ekler" strip under the note (below the notes that link to it in
// the viewer, at the bottom of the editor). A file is added from the editor's insert menu, the +
// at the end of the strip, or by dropping it on the note (images dropped into the text still go
// into the text). A click opens the file; its menu saves a copy or removes it. A note holds at
// most 250 MB of files. The files are copies kept in the app's uploads folder.

import { i18n } from '../i18n.js';

const MAX_NOTE_FILES_BYTES = 250 * 1024 * 1024;

const FILE_ICONS = [
  [/\.pdf$/i, 'fa-file-pdf'],
  [/\.(png|jpe?g|gif|webp|bmp|svg|heic|ico|tiff?)$/i, 'fa-file-image'],
  [/\.(zip|rar|7z|tar|gz|bz2|xz)$/i, 'fa-file-zipper'],
  [/\.(docx?|odt|rtf)$/i, 'fa-file-word'],
  [/\.(xlsx?|ods|csv)$/i, 'fa-file-excel'],
  [/\.(pptx?|odp)$/i, 'fa-file-powerpoint'],
  [/\.(mp3|wav|flac|ogg|m4a|aac|wma)$/i, 'fa-file-audio'],
  [/\.(mp4|mkv|mov|avi|webm|wmv|m4v)$/i, 'fa-file-video'],
  [/\.(txt|md|log)$/i, 'fa-file-lines'],
  [
    /\.(js|ts|py|java|c|cpp|cs|go|rs|php|rb|html?|css|json|xml|ya?ml|sh|bat|ps1|sql)$/i,
    'fa-file-code',
  ],
];

export class NoteFilesFeature {
  noteFiles(note) {
    return Array.isArray(note?.attachedFiles) ? note.attachedFiles : [];
  }

  noteFilesSize(note) {
    return this.noteFiles(note).reduce((sum, file) => sum + (Number(file.size) || 0), 0);
  }

  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = Number(bytes) || 0;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    const digits = unit === 0 || value >= 10 ? 0 : 1;
    const locale = i18n.currentLanguage === 'en' ? 'en-US' : 'tr-TR';
    return `${value.toLocaleString(locale, { maximumFractionDigits: digits })} ${units[unit]}`;
  }

  noteFileIcon(title) {
    const found = FILE_ICONS.find(([pattern]) => pattern.test(title || ''));
    return `fas ${found ? found[1] : 'fa-file'}`;
  }

  // Files go on ordinary notes that can be read now (not on file notes, not on locked ones)
  canAttachFiles(note) {
    return !!note && !note.filePath && !this.isNoteLockedForView(note);
  }

  // Both strips: the viewer's and the editor's (none while an earlier version is shown)
  renderNoteFiles(note = this.currentNote) {
    const shown = !!note && !note.isVersionPreview && this.canAttachFiles(note);
    [this.viewerFiles, this.editorFiles].forEach((box) => {
      if (!box) return;
      const files = shown ? this.noteFiles(note) : [];
      box.classList.toggle('hidden', !files.length);
      const size = box.querySelector('.note-files-size');
      if (size)
        size.textContent = files.length
          ? `${this.formatFileSize(this.noteFilesSize(note))} / ${this.formatFileSize(MAX_NOTE_FILES_BYTES)}`
          : '';
      const list = box.querySelector('.note-files-list');
      list.innerHTML = '';
      files.forEach((file) => list.appendChild(this.noteFileChip(note, file)));
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'chip note-file-add';
      add.title = i18n.t('noteFiles.add');
      add.innerHTML = '<i class="fas fa-plus"></i>';
      add.addEventListener('click', () => this.pickNoteFiles(note));
      list.appendChild(add);
    });
  }

  noteFileChip(note, file) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip note-file';
    chip.dataset.name = file.name;
    chip.title = `${file.title} · ${this.formatFileSize(file.size)}`;
    chip.innerHTML = '<i></i><span class="note-file-name"></span><small></small>';
    chip.querySelector('i').className = this.noteFileIcon(file.title);
    chip.querySelector('.note-file-name').textContent = file.title;
    chip.querySelector('small').textContent = this.formatFileSize(file.size);
    chip.addEventListener('click', () => this.openNoteFile(file));
    chip.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showNoteFileMenu(note, file, e.clientX, e.clientY);
    });
    return chip;
  }

  showNoteFileMenu(note, file, x, y) {
    const menu = this.noteFileMenu;
    if (!menu) return;
    this.noteFileMenuTarget = { note, file };
    this.positionMenu(menu, x, y);
  }

  hideNoteFileMenu() {
    this.noteFileMenu?.classList.add('hidden');
    this.noteFileMenuTarget = null;
  }

  async openNoteFile(file) {
    const result = await window.electronAPI.noteFiles.open(file.name);
    if (!result?.ok) this.showNotification(i18n.t('noteFiles.missing'), 'error');
  }

  async saveNoteFileAs(file) {
    const result = await window.electronAPI.noteFiles.saveAs({
      name: file.name,
      title: file.title,
    });
    if (result?.ok) this.showNotification(i18n.t('noteFiles.saved'), 'success');
    else if (result && !result.canceled)
      this.showNotification(i18n.t('noteFiles.missing'), 'error');
  }

  removeNoteFile(note, file) {
    this.showConfirm(i18n.t('noteFiles.removeConfirm', { name: file.title }), () => {
      note.attachedFiles = this.noteFiles(note).filter((f) => f.name !== file.name);
      this.storeNoteFiles(note);
      this.showNotification(i18n.t('noteFiles.removed'), 'success');
    });
  }

  // How many more bytes this note can take
  noteFilesRoom(note) {
    return Math.max(0, MAX_NOTE_FILES_BYTES - this.noteFilesSize(note));
  }

  pickNoteFiles(note = this.currentNote) {
    return this.attachNoteFiles(note, (room) =>
      window.electronAPI.noteFiles.pick({ room, title: i18n.t('noteFiles.add') })
    );
  }

  dropNoteFiles(note, files) {
    if (!files.length) return null;
    return this.attachNoteFiles(note, (room) => window.electronAPI.noteFiles.add(files, room));
  }

  // Copy the files in (as many as fit) and keep them on the note
  async attachNoteFiles(note, copy) {
    if (!this.canAttachFiles(note)) return;
    const room = this.noteFilesRoom(note);
    if (room <= 0) {
      this.showNotification(i18n.t('noteFiles.full'), 'warning');
      return;
    }
    let result;
    try {
      result = await copy(room);
    } catch (err) {
      console.error('Attaching files failed:', err);
      result = null;
    }
    if (!result) return;
    if (result.added?.length) {
      const now = new Date().toISOString();
      note.attachedFiles = [
        ...this.noteFiles(note),
        ...result.added.map((file) => ({ ...file, addedAt: now })),
      ];
      this.storeNoteFiles(note);
      this.showNotification(i18n.t('noteFiles.added', { count: result.added.length }), 'success');
    }
    if (result.tooBig?.length) {
      this.showNotification(
        i18n.t('noteFiles.tooBig', { name: result.tooBig.join(', ') }),
        'warning'
      );
    } else if (result.failed?.length) {
      this.showNotification(
        i18n.t('noteFiles.failed', { name: result.failed.join(', ') }),
        'error'
      );
    }
  }

  // The note's files changed: stored right away (cancelling an edit does not undo them)
  storeNoteFiles(note) {
    if (!this.notes.includes(note)) {
      if (note === this.currentNote) this.upsertCurrentNote();
      else return;
    }
    this.saveNotes();
    if (note === this.currentNote) this.renderNoteFiles(note);
  }

  // Files dragged from the computer onto a note, without images (they go into the text)
  draggedFiles(e) {
    return [...(e.dataTransfer?.types || [])].includes('Files');
  }

  setupNoteFiles() {
    const api = window.electronAPI?.noteFiles;
    if (!api) return;
    // The menu of a file
    this.noteFileMenu?.addEventListener('click', (e) => {
      const item = e.target.closest('[data-action]');
      const target = this.noteFileMenuTarget;
      this.hideNoteFileMenu();
      if (!item || !target) return;
      const { note, file } = target;
      if (item.dataset.action === 'open') this.openNoteFile(file);
      else if (item.dataset.action === 'save') this.saveNoteFileAs(file);
      else if (item.dataset.action === 'remove') this.removeNoteFile(note, file);
    });
    document.addEventListener('mousedown', (e) => {
      if (this.noteFileMenu && !this.noteFileMenu.contains(e.target)) this.hideNoteFileMenu();
    });
    window.addEventListener('blur', () => this.hideNoteFileMenu());
    this.addNoteFileBtn?.addEventListener('click', () => {
      this.closeToolbarMenus?.();
      this.pickNoteFiles();
    });

    // Dropping files on the open note in the viewer attaches them
    const viewer = this.noteViewer;
    if (viewer) {
      viewer.addEventListener('dragover', (e) => {
        if (!this.draggedFiles(e) || !this.canAttachFiles(this.currentNote)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        viewer.classList.add('files-drag-over');
      });
      viewer.addEventListener('dragleave', (e) => {
        if (!viewer.contains(e.relatedTarget)) viewer.classList.remove('files-drag-over');
      });
      viewer.addEventListener('drop', (e) => {
        viewer.classList.remove('files-drag-over');
        if (!this.draggedFiles(e) || !this.canAttachFiles(this.currentNote)) return;
        e.preventDefault();
        e.stopPropagation();
        this.dropNoteFiles(this.currentNote, [...e.dataTransfer.files]);
      });
    }
  }
}
