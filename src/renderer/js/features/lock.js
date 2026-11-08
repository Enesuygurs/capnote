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
    // Set to lock when the app closes: an opened note stays open until then
    if (this.settings.relockOn === 'quit') return;
    if (
      this.currentNote &&
      this.currentNote.isLocked &&
      this.unlockedNotes.has(String(this.currentNote.id))
    ) {
      this.unlockedNotes.delete(String(this.currentNote.id));
      this.currentNote.content = '';
      this.updateNotesList();
      // Its text must not stay visible: show it locked
      if (this.isEditorOpen() || this.isViewerOpen()) {
        this.showViewer();
        this.displayNote(this.currentNote);
      }
    }
  }

  // For a locked note that is not open: ask its password. True when it is right (or not needed).
  async confirmLockedNotePassword(note) {
    if (!this.isNoteLockedForView(note)) return true;
    const password = await this.showPasswordModal(i18n.t('messages.passwordToDelete'));
    if (password === null) return false;
    if ((await this.decryptNote(note, password)) !== null) return true;
    this.showNotification(i18n.t('messages.wrongPassword'), 'error');
    return false;
  }

  // A locked note opens on its own page, which asks its password (no dialog). Asked for to edit
  // it, the editor opens once the password is right. False: it is not open yet.
  async unlockNoteForViewing(note, { thenEdit = false } = {}) {
    this.currentNote = note;
    this.pendingEditAfterUnlock = thenEdit ? note.id : null;
    this.saveLastViewedNote(note.id);
    this.showViewer();
    this.displayNote(note);
    this.setActiveNoteInList(note.id);
    return false;
  }

  // The page of a locked note: its lock, what it is, the password field and the button
  lockedNotePageHtml() {
    const t = (key) => this.escapeHtml(i18n.t(key));
    return `
      <div class="empty-state locked-note-message">
        <span class="locked-note-icon"><i class="fas fa-lock"></i></span>
        <h3>${t('messages.noteIsLocked')}</h3>
        <p>${t('lockedNote.hint')}</p>
        <form class="locked-note-form" autocomplete="off">
          <div class="locked-note-field">
            <i class="fas fa-key"></i>
            <input type="password" class="locked-note-input" placeholder="${t('lockedNote.password')}"
              aria-label="${t('lockedNote.password')}" spellcheck="false" />
            <button type="button" class="locked-note-eye" title="${t('lockedNote.show')}">
              <i class="fas fa-eye"></i>
            </button>
          </div>
          <button type="submit" class="btn-primary locked-note-submit">
            <i class="fas fa-lock-open"></i><span>${t('lockedNote.unlock')}</span>
          </button>
          <p class="locked-note-error" hidden>${t('messages.wrongPassword')}</p>
        </form>
      </div>
    `;
  }

  wireLockedNotePage(note) {
    const form = this.viewerText.querySelector('.locked-note-form');
    if (!form) return;
    const input = form.querySelector('.locked-note-input');
    const error = form.querySelector('.locked-note-error');
    const field = form.querySelector('.locked-note-field');
    const eye = form.querySelector('.locked-note-eye');
    eye.addEventListener('click', () => {
      const shown = input.type === 'text';
      input.type = shown ? 'password' : 'text';
      eye.querySelector('i').className = shown ? 'fas fa-eye' : 'fas fa-eye-slash';
      eye.title = i18n.t(shown ? 'lockedNote.show' : 'lockedNote.hide');
      input.focus();
    });
    input.addEventListener('input', () => {
      error.hidden = true;
      field.classList.remove('is-wrong');
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = input.value;
      if (!password) {
        input.focus();
        return;
      }
      form.classList.add('is-busy');
      const opened = await this.unlockWithPassword(note, password);
      form.classList.remove('is-busy');
      if (opened || !form.isConnected) return;
      // Wrong: said under the field, which shakes; the password is selected to type again
      error.hidden = false;
      field.classList.remove('is-wrong');
      void field.offsetWidth;
      field.classList.add('is-wrong');
      input.select();
    });
    // The field takes the keyboard when the page shows (not while a dialog is open)
    requestAnimationFrame(() => {
      if (input.isConnected && !document.querySelector('.modal:not(.hidden)')) input.focus();
    });
  }

  // Open a locked note for this session with its password. True when the password is right.
  async unlockWithPassword(note, password) {
    const plain = await this.decryptNote(note, password);
    if (plain === null) return false;
    note.content = plain;
    this.unlockedNotes.set(String(note.id), password);
    // Another note may have been opened while the password was checked
    if (this.currentNote !== note) {
      this.updateNotesList();
      return true;
    }
    this.originalNoteState = {
      title: note.title,
      content: note.content,
      mood: note.mood,
      weather: note.weather,
      tags: [...(note.tags || [])],
      formatting: { ...(note.formatting || this.getDefaultFormatting()) },
    };
    this.displayNote(note);
    // Its lock in the list shows open
    this.updateNotesList();
    this.setActiveNoteInList(note.id);
    if (this.pendingEditAfterUnlock === note.id) {
      this.pendingEditAfterUnlock = null;
      this.editCurrentNote();
    }
    return true;
  }

  // Lock again the locked notes opened in this session (all, or all but the one on screen)
  relockUnlockedNotes({ keepCurrent = false } = {}) {
    let changed = false;
    [...this.unlockedNotes.keys()].forEach((id) => {
      const note = this.notes.find((n) => String(n.id) === id);
      if (!note || (keepCurrent && note === this.currentNote)) return;
      this.unlockedNotes.delete(id);
      if (note.isLocked) note.content = '';
      changed = true;
    });
    if (changed) this.updateNotesList();
  }

  async toggleLock(noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;
    // A file note's text is in its file, unencrypted, so locking it would protect nothing
    if (note.filePath) {
      this.showNotification(i18n.t('files.noLock'), 'warning');
      return;
    }

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
      // Its earlier versions are plain text: they go
      note.history = (note.history || []).map(({ version, ...entry }) => entry);
      this.unlockedNotes.delete(String(note.id));
      this.showNotification(i18n.t('messages.noteLocked'), 'success');
    }

    // Refresh the viewer if the toggled note is on screen
    if (this.currentNote && this.currentNote.id === note.id && this.isViewerOpen()) {
      this.displayNote(note);
    }

    note.updatedAt = new Date().toISOString();
    await this.saveNotes();

    // Only update the specific folder if note is in a folder, otherwise update main list
    if (note.folderId) {
      this.updateSpecificFolder(note.folderId);
    } else {
      this.updateNotesList();
    }
    if (this.currentFilter === 'favorites') this.updateNotesList();
  }

  showPasswordModal(title, message = '') {
    this.passwordModalTitle.textContent = title;
    // No message: it is hidden, and the field below it takes no room above it
    this.passwordMessage.textContent = message;
    this.passwordMessage.hidden = !message;
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
