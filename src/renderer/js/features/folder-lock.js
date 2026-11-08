// Locked folders. A folder is locked with a password: the notes in it (and in the folders inside
// it) are encrypted with that password, as a locked note is, and the folder shows closed in the
// list with a lock, its notes out of every list, search and view. Its password is typed under the
// folder in the list; that opens it for this session. It locks again when it is closed (or when
// the app closes, as the setting for locked notes says), or from its menu.
//
// A note in a locked folder keeps lockedByFolder: the id of the folder whose password encrypted
// it, the nearest locked folder above it. A note locked with its own password keeps its own lock.
// Notes moved into an open locked folder are encrypted with its password, notes moved out of all
// locked folders are decrypted; nothing can be moved into a folder that is locked now.

import { i18n } from '../i18n.js';
import { encrypt, decrypt } from '../note-crypto.js';

// Encrypted with the folder's password, so the password can be checked
const LOCK_CHECK = 'capnote-folder-lock';

export class FolderLockFeature {
  folderById(id) {
    return id ? this.folders.find((f) => f.id === id) : null;
  }

  // The folder and the folders it is in, nearest first
  folderChain(folderId) {
    const chain = [];
    const seen = new Set();
    let folder = this.folderById(folderId);
    while (folder && !seen.has(folder.id)) {
      seen.add(folder.id);
      chain.push(folder);
      folder = this.folderById(this.folderParentId(folder));
    }
    return chain;
  }

  // The locked folder whose password a note in this folder is encrypted with
  nearestLockedFolder(folderId) {
    return this.folderChain(folderId).find((f) => f.isLocked) || null;
  }

  // Locked now: the folder or one it is in is locked and not opened
  isFolderLockedForView(folderId) {
    return this.folderChain(folderId).some((f) => f.isLocked && !this.unlockedFolders.has(f.id));
  }

  // A note in a folder that is locked now is out of every list and view
  isNoteHiddenByFolderLock(note) {
    return !!note?.folderId && this.isFolderLockedForView(note.folderId);
  }

  // A notice for an action on a folder that is locked now; true when it stops the action
  blockedByFolderLock(folderId) {
    if (!folderId || !this.isFolderLockedForView(folderId)) return false;
    this.showNotification(i18n.t('folderLock.unlockFirst'), 'warning');
    return true;
  }

  async checkFolderPassword(folder, password) {
    if (!folder?.lockCheck || !password) return false;
    try {
      return (await decrypt(folder.lockCheck, password)) === LOCK_CHECK;
    } catch {
      return false;
    }
  }

  // Keep every note's lock in line with the folders it is in (after moves). Encrypting takes a
  // moment: a note moved into an open locked folder is marked locked once it is encrypted.
  syncFolderLocks() {
    if (!this.unlockedFolders) return false;
    let changed = false;
    this.notes.forEach((note) => {
      // Its own password, or not readable now: left as it is
      if (note.isLocked && !note.lockedByFolder) return;
      if (this.isNoteLockedForView(note)) return;
      const target = note.folderId ? this.nearestLockedFolder(note.folderId) : null;
      if (!target) {
        if (note.lockedByFolder) {
          // Out of every locked folder: plain again
          note.isLocked = false;
          delete note.encrypted;
          delete note.lockedByFolder;
          this.unlockedNotes.delete(String(note.id));
          changed = true;
        }
        return;
      }
      if (note.lockedByFolder === target.id) return;
      const password = this.unlockedFolders.get(target.id);
      if (password) this.sealIntoFolder(note, target, password);
    });
    return changed;
  }

  async sealIntoFolder(note, folder, password) {
    if (this.folderSeals.get(note) === folder.id) return;
    this.folderSeals.set(note, folder.id);
    const content = note.content || '';
    const encrypted = await encrypt(content, password);
    this.folderSeals.delete(note);
    // Moved again meanwhile, or the folder locked or changed: the next sync decides
    if (this.nearestLockedFolder(note.folderId)?.id !== folder.id) return;
    if (this.unlockedFolders.get(folder.id) !== password || !this.notes.includes(note)) return;
    note.attachments = this.extractUploadNames(content);
    note.encrypted = encrypted;
    note.isLocked = true;
    note.lockedByFolder = folder.id;
    note.history = (note.history || []).map(({ version, ...entry }) => entry);
    this.unlockedNotes.set(String(note.id), password);
    await this.saveNotes();
    // Written to while it was encrypted: encrypted again with the latest text
    if ((note.content || '') !== content) this.resealNote(note);
    this.updateNotesList();
  }

  // Lock a folder with a new password
  async lockFolder(folder) {
    if (!folder || folder.isLocked) return;
    const password = await this.showPasswordModal(i18n.t('folderLock.setPassword'));
    if (!password) return;
    // The open note's edits are kept before it is encrypted
    if (this.isEditorOpen() && this.currentNote?.folderId) this.saveNote(true);
    const inside = new Set([folder.id, ...this.folderDescendantIds(folder.id)]);
    // The notes this folder's password will encrypt: not those with their own password or in a
    // locked folder inside this one
    const notes = this.notes.filter((note) => {
      if (!note.folderId || !inside.has(note.folderId)) return false;
      if (note.isLocked && !note.lockedByFolder) return false;
      const nearest = this.folderChain(note.folderId).find((f) => f.isLocked || f === folder);
      return nearest === folder && !this.isNoteLockedForView(note);
    });
    const sealed = await Promise.all(
      notes.map(async (note) => ({ note, encrypted: await encrypt(note.content || '', password) }))
    );
    folder.lockCheck = await encrypt(LOCK_CHECK, password);
    folder.isLocked = true;
    sealed.forEach(({ note, encrypted }) => {
      note.attachments = this.extractUploadNames(note.content);
      note.encrypted = encrypted;
      note.isLocked = true;
      note.lockedByFolder = folder.id;
      note.history = (note.history || []).map(({ version, ...entry }) => entry);
      note.content = '';
      this.unlockedNotes.delete(String(note.id));
    });
    folder.expanded = false;
    await this.saveFolders();
    await this.saveNotes();
    this.afterFolderLockChange();
    this.showNotification(i18n.t('folderLock.locked', { name: folder.name }), 'success');
  }

  // Open a locked folder for this session. True when the password is right.
  async unlockFolder(folder, password) {
    if (!(await this.checkFolderPassword(folder, password))) return false;
    const notes = this.notes.filter((n) => n.lockedByFolder === folder.id && n.isLocked);
    const opened = await Promise.all(
      notes.map(async (note) => ({ note, plain: await this.decryptNote(note, password) }))
    );
    opened.forEach(({ note, plain }) => {
      if (plain === null) return;
      note.content = plain;
      this.unlockedNotes.set(String(note.id), password);
    });
    this.unlockedFolders.set(folder.id, password);
    folder.expanded = true;
    await this.saveFolders();
    this.updateNotesList();
    this.updateFoldersList();
    return true;
  }

  // Lock an opened folder again (and the opened locked folders inside it)
  relockFolder(folder) {
    if (!folder || !this.unlockedFolders.has(folder.id)) return;
    const inside = new Set([folder.id, ...this.folderDescendantIds(folder.id)]);
    // The open note's edits are kept first (encrypted with the password it is open with)
    if (this.isEditorOpen() && this.currentNote?.folderId && inside.has(this.currentNote.folderId))
      this.saveNote(true);
    const closing = new Set([...inside].filter((id) => this.unlockedFolders.has(id)));
    closing.forEach((id) => this.unlockedFolders.delete(id));
    this.notes.forEach((note) => {
      if (!note.lockedByFolder || !closing.has(note.lockedByFolder)) return;
      this.unlockedNotes.delete(String(note.id));
      note.content = '';
    });
    folder.expanded = false;
    this.saveFolders();
    this.afterFolderLockChange();
  }

  // Take the lock off a folder (its password is asked)
  async removeFolderLock(folder) {
    if (!folder?.isLocked) return;
    const password = await this.showPasswordModal(i18n.t('folderLock.passwordToRemove'));
    if (password === null) return;
    if (!(await this.checkFolderPassword(folder, password))) {
      this.showNotification(i18n.t('messages.wrongPassword'), 'error');
      return;
    }
    if (!this.unlockedFolders.has(folder.id)) await this.unlockFolder(folder, password);
    this.unlockedFolders.delete(folder.id);
    folder.isLocked = false;
    delete folder.lockCheck;
    // Its notes take the lock of a locked folder above it, or none (only those that opened)
    this.notes.forEach((note) => {
      if (note.lockedByFolder !== folder.id || !this.unlockedNotes.has(String(note.id))) return;
      note.isLocked = false;
      delete note.encrypted;
      delete note.lockedByFolder;
      this.unlockedNotes.delete(String(note.id));
    });
    await this.saveFolders();
    await this.saveNotes();
    this.afterFolderLockChange();
    this.showNotification(i18n.t('folderLock.removed', { name: folder.name }), 'success');
  }

  // The list again; the open note leaves the screen if its folder locked
  afterFolderLockChange() {
    this.updateNotesList();
    this.updateFoldersList();
    this.updateStats();
    if (this.currentNote && this.isNoteHiddenByFolderLock(this.currentNote)) {
      this.currentNote = null;
      this.showWelcome();
    }
  }

  // The password row under a locked folder in the list
  toggleFolderUnlockRow(folder, header) {
    const container = header.parentElement;
    const open = container.querySelector(':scope > .folder-unlock');
    if (open) {
      open.remove();
      return;
    }
    document.querySelectorAll('.folder-unlock').forEach((row) => row.remove());
    const row = document.createElement('form');
    row.className = 'folder-unlock';
    row.autocomplete = 'off';
    row.innerHTML = `
      <i class="fas fa-key"></i>
      <input type="password" class="folder-unlock-input" spellcheck="false" />
      <button type="submit" class="folder-unlock-btn"><i class="fas fa-arrow-right"></i></button>
    `;
    const input = row.querySelector('input');
    input.placeholder = i18n.t('folderLock.password');
    input.setAttribute('aria-label', i18n.t('folderLock.password'));
    row.querySelector('button').title = i18n.t('lockedNote.unlock');
    header.after(row);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        row.remove();
      }
    });
    input.addEventListener('input', () => row.classList.remove('is-wrong'));
    row.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!input.value) return;
      row.classList.add('is-busy');
      const ok = await this.unlockFolder(folder, input.value);
      row.classList.remove('is-busy');
      if (ok || !row.isConnected) return;
      row.classList.remove('is-wrong');
      void row.offsetWidth;
      row.classList.add('is-wrong');
      input.select();
    });
    input.focus();
  }

  // The folder menu's lock items: lock / remove the lock, and lock now for an opened one
  updateFolderLockMenu(folder) {
    const lockedNow = !!folder && this.isFolderLockedForView(folder.id);
    if (this.lockFolderMenuItem) {
      this.lockFolderMenuItem.querySelector('i').className = folder?.isLocked
        ? 'fas fa-lock-open'
        : 'fas fa-lock';
      this.lockFolderMenuItem.querySelector('span').textContent = i18n.t(
        folder?.isLocked ? 'folderLock.remove' : 'folderLock.lock'
      );
      // A folder inside a locked one cannot be seen to lock it; inside an open one it can
      this.lockFolderMenuItem.hidden = !folder;
    }
    if (this.relockFolderMenuItem) {
      this.relockFolderMenuItem.hidden = !(folder?.isLocked && this.unlockedFolders.has(folder.id));
    }
    // Nothing goes into a folder that is locked now
    [this.newNoteInFolderMenuItem, this.newSubfolderMenuItem].forEach((item) => {
      if (item) item.hidden = lockedNow;
    });
  }

  setupFolderLock() {
    this.lockFolderMenuItem?.addEventListener('click', () => {
      const folder = this.folderById(this.selectedFolderId);
      this.hideContextMenu();
      if (!folder) return;
      if (folder.isLocked) this.removeFolderLock(folder);
      else this.lockFolder(folder);
    });
    this.relockFolderMenuItem?.addEventListener('click', () => {
      const folder = this.folderById(this.selectedFolderId);
      this.hideContextMenu();
      if (folder) this.relockFolder(folder);
    });
  }
}
