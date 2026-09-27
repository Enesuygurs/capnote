// Escape keeps a new note that has something in it (only the Cancel button deletes a new note),
// removes an empty new note, and drops unsaved changes of a note being edited
export async function run() {
  const a = window.app;
  const esc = () =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const r = {};

  a.createNewNote();
  a.noteTitle.value = 'Draft';
  a.richEditor.innerHTML = '<p>written</p>';
  esc();
  r.kept = {
    notes: a.notes.map((n) => n.title),
    viewer: a.isViewerOpen(),
    content: a.currentNote.content,
  };
  // Now an ordinary note: Cancel on a later edit keeps it
  await a.editCurrentNote();
  a.cancelEdit();
  r.stillThere = a.notes.length;

  a.createNewNote();
  esc();
  r.emptyGone = a.notes.map((n) => n.title);

  await a.editCurrentNote();
  a.noteTitle.value = 'Changed';
  esc();
  r.editDropped = a.notes[0].title;
  return r;
}

export const expected = {
  kept: { notes: ['Draft'], viewer: true, content: '<p>written</p>' },
  stillThere: 1,
  emptyGone: ['Draft'],
  editDropped: 'Draft',
};
