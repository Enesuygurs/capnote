// Hidden titles for locked notes and folders (a setting). With it on, a locked note's title, tags,
// mood, weather and counts are encrypted with its password too (sealedMeta), and a locked folder's
// name with the folder's (sealedName). While locked they are blank in memory and on disk; the list
// shows "Kilitli not" / "Kilitli klasör". Opening it puts them back.
//
// A password is needed to encrypt, so a locked note that is not open gets its title encrypted the
// next time it is opened; until then its title is only hidden on screen. Turning the setting off
// takes the encryption off the same way: at once for open notes, at the next opening for others.

import { i18n } from '../i18n.js';
import { encrypt, decrypt } from '../note-crypto.js';

const META_FIELDS = ['title', 'tags', 'mood', 'weather', 'wordCount', 'charCount'];

export class LockMetaFeature {
  hidesLockedTitles() {
    return !!this.settings?.hideLockedTitles;
  }

  // A locked note shows no title now: it is locked and its title is hidden (or still encrypted)
  isNoteTitleHidden(note) {
    return (
      !!note?.isLocked &&
      this.isNoteLockedForView(note) &&
      (!!note.sealedMeta || this.hidesLockedTitles())
    );
  }

  isFolderNameHidden(folder) {
    return (
      !!folder?.isLocked &&
      this.isFolderLockedForView(folder.id) &&
      (!!folder.sealedName || this.hidesLockedTitles())
    );
  }

  folderDisplayName(folder) {
    if (!folder) return '';
    if (this.isFolderNameHidden(folder) || !folder.name) return i18n.t('folderLock.hiddenName');
    return folder.name;
  }

  // Encrypt the note's title and details with its password (setting on), or drop them (off)
  async sealNoteMeta(note, password) {
    if (!note || !password) return;
    if (!this.hidesLockedTitles()) {
      delete note.sealedMeta;
      return;
    }
    const meta = {};
    META_FIELDS.forEach((key) => (meta[key] = note[key] ?? null));
    note.sealedMeta = await encrypt(JSON.stringify(meta), password);
  }

  // Put back the title and details of a note just opened with its password
  async openNoteMeta(note, password) {
    if (!note?.sealedMeta) return;
    try {
      const meta = JSON.parse(await decrypt(note.sealedMeta, password));
      META_FIELDS.forEach((key) => {
        if (key in meta) note[key] = meta[key];
      });
      if (!Array.isArray(note.tags)) note.tags = [];
    } catch {
      // Wrong password or damaged: left hidden
    }
  }

  // Locked again: what is encrypted is blank in memory too
  blankNoteMeta(note) {
    if (!note?.sealedMeta) return;
    note.title = '';
    note.tags = [];
    note.mood = null;
    note.weather = null;
    note.wordCount = 0;
    note.charCount = 0;
  }

  // Opened with its password: its title encrypted or decrypted as the setting says now
  async settleNoteMeta(note, password) {
    await this.openNoteMeta(note, password);
    await this.sealNoteMeta(note, password);
  }

  async sealFolderName(folder, password) {
    if (!folder || !password) return;
    if (!this.hidesLockedTitles()) {
      delete folder.sealedName;
      return;
    }
    folder.sealedName = await encrypt(folder.name || '', password);
  }

  async openFolderName(folder, password) {
    if (!folder?.sealedName) return;
    try {
      folder.name = await decrypt(folder.sealedName, password);
    } catch {
      // left hidden
    }
  }

  blankFolderName(folder) {
    if (folder?.sealedName) folder.name = '';
  }

  // How they are stored: a locked note's / folder's encrypted details are blank in the file
  serializeNoteMeta(note) {
    if (!note.isLocked || !note.sealedMeta) return note;
    return {
      ...note,
      title: '',
      tags: [],
      mood: null,
      weather: null,
      wordCount: 0,
      charCount: 0,
    };
  }

  // Reminders and notifications keep a copy of their note's title: blank for a note whose title
  // is hidden (the screens show the note's current title)
  withoutHiddenTitles(items) {
    return items.map((item) => {
      const note = item.noteId ? this.notes.find((n) => n.id === item.noteId) : null;
      const hidden = note?.isLocked && (note.sealedMeta || this.hidesLockedTitles());
      return hidden && item.noteTitle ? { ...item, noteTitle: '' } : item;
    });
  }

  serializeFolders() {
    return this.folders.map((folder) =>
      folder.isLocked && folder.sealedName ? { ...folder, name: '' } : folder
    );
  }

  // The setting changed: the notes and folders open now follow it at once
  async applyHiddenTitlesSetting() {
    const jobs = [];
    this.notes.forEach((note) => {
      const password = this.unlockedNotes.get(String(note.id));
      if (note.isLocked && password) jobs.push(this.sealNoteMeta(note, password));
    });
    this.folders.forEach((folder) => {
      const password = this.unlockedFolders?.get(folder.id);
      if (folder.isLocked && password) jobs.push(this.sealFolderName(folder, password));
    });
    await Promise.all(jobs);
    await this.saveNotes();
    await this.saveFolders();
    await this.saveReminders();
    await this.saveNotifications();
    this.updateNotesList();
    this.updateFoldersList();
    if (this.currentNote && this.isViewerOpen()) this.displayNote(this.currentNote);
  }
}
