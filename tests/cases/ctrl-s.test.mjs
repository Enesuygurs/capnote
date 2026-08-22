// Ctrl+S does nothing in the viewer and saves the note being edited

export async function run() {
  const a = window.app;
  const key = (k, opts = {}) =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...opts }));
  // note A
  a.createNewNote();
  a.noteTitle.value = 'Note A';
  a.richEditor.innerHTML = '<p>alpha content</p>';
  a.saveNote(true);
  // note B
  a.createNewNote();
  a.noteTitle.value = 'Note B';
  a.richEditor.innerHTML = '<p>beta content</p>';
  a.saveNote(true);
  const noteA = a.notes.find((n) => n.title === 'Note A');
  a.selectNote(noteA); // viewer shows A, editor still holds B
  key('s', { ctrlKey: true }); // user presses Ctrl+S in viewer
  const after = a.notes.find((n) => n.id === noteA.id);
  a.editCurrentNote();
  a.noteTitle.value = 'Note A2';
  key('s', { ctrlKey: true });
  const edited = a.notes.find((n) => n.id === noteA.id);
  return {
    titleAfter: after.title,
    contentAfter: after.content,
    editorSaveTitle: edited.title,
    editorSaveContent: edited.content,
  };
}

export const expected = {
  titleAfter: 'Note A2',
  contentAfter: '<p>alpha content</p>',
  editorSaveTitle: 'Note A2',
  editorSaveContent: '<p>alpha content</p>',
};
