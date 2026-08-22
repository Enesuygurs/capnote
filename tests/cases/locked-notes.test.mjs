// Locked notes are stored encrypted, reject a wrong password, lock again when left and stay out of search and backups

export async function run() {
  const a = window.app;
  const answer = (pw) =>
    setTimeout(() => {
      a.passwordInput.value = pw ?? '';
      pw === null ? a.hidePasswordModal() : a.handlePasswordConfirm();
    }, 30);
  const stored = async () =>
    (await window.electronAPI.storage.load()).data.notes.find((n) => n.title === 'Secret');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const r = {};

  a.createNewNote();
  a.noteTitle.value = 'Secret';
  a.richEditor.innerHTML = '<p>top secret</p>';
  a.saveNote(true);
  const n = a.currentNote;
  answer('pw1');
  await a.toggleLock(n.id);
  r.afterLock = {
    leaksPlain: JSON.stringify((await window.electronAPI.storage.load()).data.notes).includes(
      'top secret'
    ),
    hasPassword: 'password' in (await stored()),
    hasCipher: !!(await stored()).encrypted,
    memoryContent: n.content,
  };

  answer('nope');
  await a.unlockNoteForViewing(n);
  r.wrongPwRejected = a.isNoteLockedForView(n);

  answer('pw1');
  await a.unlockNoteForViewing(n);
  r.unlockedView = a.viewerText.textContent.includes('top secret');

  await a.editCurrentNote();
  a.richEditor.innerHTML = '<p>edited secret</p>';
  a.saveNote(true);
  await wait(1500);
  r.afterEdit = {
    leaksPlain: JSON.stringify((await window.electronAPI.storage.load()).data.notes).includes(
      'edited secret'
    ),
    decrypts: await (
      await import(new URL('js/note-crypto.js', location.href).href)
    ).decrypt((await stored()).encrypted, 'pw1'),
  };

  // leave the note -> auto-lock wipes plaintext
  a.createNewNote();
  a.cancelEdit();
  a.createNewNote();
  a.noteTitle.value = 'Other';
  a.richEditor.innerHTML = '<p>o</p>';
  a.saveNote(true);
  a.selectNote(a.notes.find((x) => x.title === 'Other'));
  r.autoLocked = { locked: a.isNoteLockedForView(n), memoryContent: n.content };

  // search must not reveal locked content
  a.searchInput.value = 'edited';
  a.searchNotes();
  r.searchHits = a.notesList.querySelectorAll('.note-item').length;
  a.searchInput.value = '';
  a.searchNotes();

  const backup = a.serializeNotes().find((x) => x.title === 'Secret');
  r.backupLeaks = JSON.stringify(backup).includes('edited secret');

  answer('pw1');
  await a.toggleLock(n.id);
  r.permanentUnlock = {
    locked: n.isLocked,
    content: n.content,
    cipherGone: !('encrypted' in (await stored())),
    storedContent: (await stored()).content,
  };
  return r;
}

export const expected = {
  afterLock: {
    leaksPlain: false,
    hasPassword: false,
    hasCipher: true,
    memoryContent: '',
  },
  wrongPwRejected: true,
  unlockedView: true,
  afterEdit: {
    leaksPlain: false,
    decrypts: '<p>edited secret</p>',
  },
  autoLocked: {
    locked: true,
    memoryContent: '',
  },
  searchHits: 0,
  backupLeaks: false,
  permanentUnlock: {
    locked: false,
    content: '<p>edited secret</p>',
    cipherGone: true,
    storedContent: '<p>edited secret</p>',
  },
};
