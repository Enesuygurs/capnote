// Locking when away: after some minutes with no keyboard or mouse input anywhere on the computer
// (the setting), and at once when the screen locks or the computer sleeps, the locked notes and
// folders opened in this session lock again. Edits of an open one are encrypted and kept first.

import { forgetKeys } from '../note-crypto.js';

const CHECK_EVERY_MS = 15 * 1000;
// The keys go this long after everything locked (the last edits are encrypted with them first)
const FORGET_KEYS_AFTER_MS = 3000;

export class IdleLockFeature {
  idleLockMinutes() {
    const minutes = Number(this.settings?.idleLockMinutes);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
  }

  // Anything opened with a password now
  hasOpenLocks() {
    return this.unlockedNotes.size > 0 || (this.unlockedFolders?.size || 0) > 0;
  }

  // Every opened lock closes: folders (with the notes in them), then the notes opened one by one;
  // the note on screen shows its lock page
  lockEverythingNow() {
    if (!this.hasOpenLocks()) return false;
    const current = this.currentNote;
    if (current?.isLocked && !current.lockedByFolder && !this.isNoteLockedForView(current)) {
      this.relockNote(current);
    }
    [...(this.unlockedFolders?.keys() || [])].forEach((id) => {
      if (this.unlockedFolders.has(id)) this.relockFolder(this.folderById(id));
    });
    this.relockUnlockedNotes();
    // No key stays in memory, here or in the main process (with its decrypted file copies), once
    // the edits being encrypted now are written with them
    clearTimeout(this.forgetKeysTimer);
    this.forgetKeysTimer = setTimeout(() => {
      forgetKeys();
      window.electronAPI?.lockedImages?.forget?.();
    }, FORGET_KEYS_AFTER_MS);
    return true;
  }

  async checkIdleLock() {
    const minutes = this.idleLockMinutes();
    if (!minutes || !this.hasOpenLocks()) return;
    const seconds = await window.electronAPI?.system?.idleSeconds?.().catch(() => 0);
    if (seconds >= minutes * 60) this.lockEverythingNow();
  }

  setupIdleLock() {
    this.idleLockTimer = setInterval(() => this.checkIdleLock(), CHECK_EVERY_MS);
    // The screen locked or the computer went to sleep: at once (unless the setting is off)
    window.electronAPI?.system?.onAway?.(() => {
      if (this.idleLockMinutes()) this.lockEverythingNow();
    });
  }
}
