// Escape closes the topmost thing: dialogs before the editor, and cancels the password prompt;
// then, with a note open, Ctrl+F finds in it (Escape closes that) and Ctrl+Shift+F searches the notes

export async function run() {
  const a = window.app;
  const esc = () =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  a.createNewNote();
  a.noteTitle.value = 'E';
  a.richEditor.innerHTML = '<p>e</p>';
  a.saveNote();
  a.showTodosScreen();
  esc();
  const r1 = !a.todosScreen.classList.contains('hidden');
  await a.editCurrentNote();
  a.showSettingsModal();
  esc();
  const r2 = {
    editorStillOpen: a.isEditorOpen(),
    settingsClosed: a.settingsModal.classList.contains('hidden'),
  };
  esc();
  const r3 = a.isViewerOpen();
  let resolved = 'pending';
  a.showPasswordModal('x').then((v) => (resolved = v));
  esc();
  await new Promise((r) => setTimeout(r, 10));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));
  const findFocused = document.activeElement === a.find.query;
  esc();
  const findClosed = !a.isFindOpen();
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'F', ctrlKey: true, shiftKey: true, bubbles: true })
  );
  return {
    findFocused,
    findClosed,
    todosStayOnEsc: r1,
    r2,
    escLeavesEditor: r3,
    passwordResolved: resolved,
    searchFocused: document.activeElement === a.searchInput,
  };
}

export const expected = {
  findFocused: true,
  findClosed: true,
  todosStayOnEsc: true,
  r2: {
    editorStillOpen: true,
    settingsClosed: true,
  },
  escLeavesEditor: true,
  passwordResolved: null,
  searchFocused: true,
};
