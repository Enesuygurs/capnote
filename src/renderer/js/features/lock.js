// Locked notes: encryption, unlocking and the password dialog

import { i18n } from '../i18n.js';
import { encrypt, decrypt } from '../note-crypto.js';

export class LockFeature {
  // Older versions stored the lock password in plain text next to plaintext content
  async migrateLegacyLockedNotes() {
    const legacy = this.notes.filter((note) => note.isLocked && typeof note.password === 'string');
    for (const note of legacy) {
      note.attachments = this.extractUploadNames(note.content);
      note.encrypted = await encrypt(note.content || '', note.password);
      note.content = '';
      delete note.password;
    }
    if (legacy.length > 0) await this.saveNotes();
  }

  // Re-encrypt an unlocked locked note after its content changed
  async resealNote(note) {
    const password = this.unlockedNotes.get(String(note.id));
    if (!note.isLocked || !password) return;
    const request = {};
    this.sealRequests.set(note, request);
    const encrypted = await encrypt(note.content || '', password);
    if (this.sealRequests.get(note) !== request) return;
    note.encrypted = encrypted;
    this.saveNotes();
  }

  // Returns the decrypted content, or null when the password is wrong
  async decryptNote(note, password) {
    if (!note.encrypted) return null;
    try {
      return this.toPortableUploadUrls(await decrypt(note.encrypted, password));
    } catch {
      return null;
    }
  }

  isNoteLockedForView(note) {
    return !!(note && note.isLocked && !this.unlockedNotes.has(String(note.id)));
  }

  /**
   * Re-locks the current note when leaving it if it was unlocked for this session
   */
  autoLockCurrentNote() {
    if (
      this.currentNote &&
      this.currentNote.isLocked &&
      this.unlockedNotes.has(String(this.currentNote.id))
    ) {
      this.unlockedNotes.delete(String(this.currentNote.id));
      this.currentNote.content = '';
      this.updateNotesList();
    }
  }

  async unlockNoteForViewing(note) {
    const password = await this.showPasswordModal(i18n.t('messages.noteIsLocked'));
    const plain = password === null ? null : await this.decryptNote(note, password);
    if (plain !== null) {
      // Temporarily unlock the note for viewing (session only)
      note.content = plain;
      this.unlockedNotes.set(String(note.id), password);

      // Continue with note selection
      this.currentNote = note;
      this.originalNoteState = {
        title: note.title,
        content: note.content,
        mood: note.mood,
        weather: note.weather,
        tags: [...(note.tags || [])],
        formatting: { ...(note.formatting || this.getDefaultFormatting()) },
      };

      this.saveLastViewedNote(note.id);
      this.showViewer();
      this.displayNote(note);
      this.setActiveNoteInList(this.currentNote.id);

      this.showNotification(i18n.t('messages.noteTemporarilyUnlocked'), 'info');
      return true;
    }
    if (password !== null) {
      // null means cancelled
      this.showNotification(i18n.t('messages.wrongPassword'), 'error');
    }
    return false;
  }

  async toggleLock(noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;

    if (note.isLocked) {
      // Unlock note - ask for password
      const password = await this.showPasswordModal(i18n.t('messages.enterPasswordToOpen'));
      if (password === null) return;
      const plain = await this.decryptNote(note, password);
      if (plain === null) {
        this.showNotification(i18n.t('messages.wrongPassword'), 'error');
        return;
      }

      note.content = plain;
      note.isLocked = false;
      delete note.encrypted;
      this.unlockedNotes.delete(String(note.id));
      this.showNotification(i18n.t('messages.noteUnlocked'), 'success');
    } else {
      // Lock note - ask for password
      const password = await this.showPasswordModal(i18n.t('messages.setPasswordForNote'));
      if (!password) return;

      // Persist pending editor changes of this note before its content is encrypted
      if (this.currentNote === note && this.isEditorOpen()) {
        this.saveNote(true);
        this.showViewer();
      }

      note.attachments = this.extractUploadNames(note.content);
      note.encrypted = await encrypt(note.content || '', password);
      note.content = '';
      note.isLocked = true;
      this.unlockedNotes.delete(String(note.id));
      this.showNotification(i18n.t('messages.noteLocked'), 'success');
    }

    // Refresh the viewer if the toggled note is on screen
    if (this.currentNote && this.currentNote.id === note.id && this.isViewerOpen()) {
      this.displayNote(note);
    }

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
    if (this.currentFilter === 'favorites') this.updateNotesList();
  }

  showPasswordModal(title, message = '') {
    // Clear existing content
    this.passwordModalTitle.innerHTML = '';
    // Create icon element (Font Awesome) — not an emoji
    const icon = document.createElement('i');
    icon.className = 'fas fa-lock modal-title-icon';
    icon.setAttribute('aria-hidden', 'true');
    // Append icon then the plain text title (avoid injecting HTML from title)
    this.passwordModalTitle.appendChild(icon);
    this.passwordModalTitle.appendChild(document.createTextNode(' ' + title));
    if (message) {
      this.passwordMessage.textContent = message;
      this.passwordMessage.style.display = 'block';
    } else {
      this.passwordMessage.style.display = 'none';
    }
    this.passwordInput.value = '';
    this.passwordModal.classList.remove('hidden');

    // Focus input after a short delay to ensure modal is visible
    setTimeout(() => {
      this.passwordInput.focus();
    }, 100);

    return new Promise((resolve) => {
      this.passwordModalResolve = resolve;
    });
  }

  hidePasswordModal() {
    this.passwordModal.classList.add('hidden');
    if (this.passwordModalResolve) {
      this.passwordModalResolve(null);
      this.passwordModalResolve = null;
    }
  }

  handlePasswordConfirm() {
    const password = this.passwordInput.value;
    if (password === '') {
      this.showNotification(i18n.t('messages.enterPassword'), 'warning');
      return;
    }

    if (this.passwordModalResolve) {
      this.passwordModalResolve(password);
      this.passwordModalResolve = null;
    }
    this.passwordModal.classList.add('hidden');
  }
}
