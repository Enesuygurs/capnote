// Fixes of the known open issues: Ctrl+Z undoes block tools too, deleting a locked note needs its
// password (a deleted folder keeps its locked notes), favoriting or pinning is not an edit, and
// untitled notes are named in the current language (older stored names are cleared)

export async function seed() {
  const t0 = '2026-03-01T09:30:00.000Z';
  await window.electronAPI.storage.save('notes', [
    { id: 'u1', title: 'Başlıksız Not', content: '<p>x</p>', createdAt: t0, updatedAt: t0 },
  ]);
  return 'seeded';
}

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ed = a.richEditor;
  const key = (k, extra = {}) =>
    ed.dispatchEvent(
      new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra })
    );
  const r = {};

  // Older untitled name cleared, shown in the current language
  const old = a.notes.find((n) => n.id === 'u1');
  r.legacyTitle = [old.title, a.displayTitle(old)];

  // Undo and redo across typing and a block tool
  a.createNewNote();
  ed.innerHTML = '<p>start</p>';
  ed.focus();
  a.resetEditorHistory();
  a.placeCaretAtEnd(ed.querySelector('p'));
  document.execCommand('insertText', false, ' typed');
  await wait(900);
  a.insertCodeBlockInRich();
  const withBlock = !!ed.querySelector('pre');
  key('z', { ctrlKey: true });
  const blockUndone = !ed.querySelector('pre') && ed.textContent.includes('typed');
  key('z', { ctrlKey: true });
  const typingUndone = ed.textContent.trim() === 'start';
  key('y', { ctrlKey: true });
  key('y', { ctrlKey: true });
  const redone = !!ed.querySelector('pre') && ed.textContent.includes('typed');
  r.undo = { withBlock, blockUndone, typingUndone, redone };
  a.cancelEdit();

  // A locked note: deleting it asks for the password; a wrong one keeps it
  const answer = (value) => {
    setTimeout(() => {
      a.passwordInput.value = value;
      a.handlePasswordConfirm();
    }, 100);
  };
  const makeLocked = async (title) => {
    a.createNewNote();
    a.noteTitle.value = title;
    ed.innerHTML = '<p>hidden</p>';
    a.saveNote(true);
    const note = a.currentNote;
    a.showWelcome();
    a.currentNote = null;
    answer('pw');
    await a.toggleLock(note.id);
    return note;
  };
  const locked = await makeLocked('Secret');
  answer('wrong');
  await a.deleteNoteById(locked.id);
  r.wrongPasswordKeeps = a.notes.includes(locked);
  answer('pw');
  const deleting = a.deleteNoteById(locked.id);
  await deleting;
  await wait(50);
  a.confirmBtn.click();
  r.rightPasswordDeletes = !a.notes.includes(locked);

  // A deleted folder keeps its locked notes, in the root list
  const locked2 = await makeLocked('Secret 2');
  a.folders.push({ id: 'fl', name: 'Vault', color: '#3b82f6' });
  locked2.folderId = 'fl';
  a.selectedFolderId = 'fl';
  a.deleteSelectedFolder();
  a.confirmBtn.click();
  r.folderKeepsLocked = [
    a.folders.some((f) => f.id === 'fl'),
    a.notes.includes(locked2),
    locked2.folderId,
  ];

  // Favorite and pin do not change "last edited"
  const before = old.updatedAt;
  await a.toggleFavorite('u1');
  await a.togglePin('u1');
  r.notAnEdit = old.updatedAt === before;

  return r;
}

export const expected = {
  legacyTitle: ['', 'Başlıksız Not'],
  undo: { withBlock: true, blockUndone: true, typingUndone: true, redone: true },
  wrongPasswordKeeps: true,
  rightPasswordDeletes: true,
  folderKeepsLocked: [false, true, null],
  notAnEdit: true,
};
