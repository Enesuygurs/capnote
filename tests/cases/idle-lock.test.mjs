// Away from the computer, opened locks close: a locked note open in the editor keeps its edits
// (encrypted), an opened locked folder locks with its notes; set to off, nothing locks

export async function run() {
  const a = window.app;
  const answer = (pw) =>
    setTimeout(() => {
      a.passwordInput.value = pw;
      a.handlePasswordConfirm();
    }, 30);
  const r = {};

  // Titles of locked notes are encrypted too (the title must survive the lock)
  a.settings.hideLockedTitles = true;
  // A locked note, opened and being edited
  a.createNewNote();
  a.noteTitle.value = 'Gizli';
  a.richEditor.innerHTML = '<p>ilk</p>';
  a.saveNote(true);
  const note = a.currentNote;
  answer('pw');
  await a.toggleLock(note.id);
  await a.unlockWithPassword(note, 'pw');
  a.editCurrentNote();
  a.richEditor.innerHTML = '<p>ikinci</p>';
  a.trackContentChanges();

  // A locked folder, opened
  a.folderNameInput.value = 'Kasa';
  await a.createFolder();
  const folder = a.folders[a.folders.length - 1];
  answer('fp');
  await a.lockFolder(folder);
  await a.unlockFolder(folder, 'fp');

  r.defaultMinutes = a.settings.idleLockMinutes;
  r.idleApi = typeof (await window.electronAPI.system.idleSeconds());

  // Set to off: nothing locks
  a.settings.idleLockMinutes = 0;
  window.electronAPI.system.idleSeconds = undefined;
  await a.checkIdleLock();
  r.offKeepsOpen = a.hasOpenLocks();

  // Away: everything locks
  r.locked = a.lockEverythingNow();
  r.noteLocked = a.isNoteLockedForView(note);
  r.folderLocked = a.isFolderLockedForView(folder.id);
  r.openLocks = a.hasOpenLocks();
  r.pageShown = !!a.viewerText.querySelector('.locked-note-form');
  await new Promise((done) => setTimeout(done, 400));
  r.editsKept = (await a.decryptNote(note, 'pw'))?.includes('ikinci');
  await a.unlockWithPassword(note, 'pw');
  r.titleKept = note.title;
  return r;
}

export const expected = {
  defaultMinutes: 5,
  idleApi: 'number',
  offKeepsOpen: true,
  locked: true,
  noteLocked: true,
  folderLocked: true,
  openLocks: false,
  editsKept: true,
  pageShown: true,
  titleKept: 'Gizli',
};
