// Cancelling a new note returns to the previous note, or to the welcome screen

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Kept';
  a.richEditor.innerHTML = '<p>k</p>';
  a.saveNote();
  a.createNewNote();
  a.cancelEdit();
  const r1 = { current: a.currentNote?.title, viewer: a.isViewerOpen(), count: a.notes.length };
  a.notes = [];
  a.currentNote = null;
  a.createNewNote();
  a.cancelEdit();
  return {
    r1,
    r2: { current: a.currentNote, welcome: !a.welcomeScreen.classList.contains('hidden') },
  };
}

export const expected = {
  r1: {
    current: 'Kept',
    viewer: true,
    count: 1,
  },
  r2: {
    current: null,
    welcome: true,
  },
};
