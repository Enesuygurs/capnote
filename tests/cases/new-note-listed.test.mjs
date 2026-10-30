// A new note is saved the moment it is created, so it is in the list (and stored) while it is
// written; one left as empty as it was created is removed again when it is left or cancelled
export async function run() {
  const a = window.app;
  const listed = () => [...a.notesList.querySelectorAll('.note-item')].length;
  const stored = async () => ((await window.electronAPI.storage.load()).data.notes || []).length;
  const r = {};

  a.createNewNote();
  await new Promise((res) => setTimeout(res, 100));
  r.created = { notes: a.notes.length, listed: listed(), stored: await stored() };
  r.active = a.notesList.querySelector('.note-item.active')?.dataset.noteId === a.currentNote.id;

  // Left empty for another new note: only the new one stays
  a.createNewNote();
  r.leftEmpty = a.notes.length;

  // Written in, then left: it stays, with what was written
  a.noteTitle.value = 'Kept';
  a.createNewNote();
  r.written = a.notes.map((n) => n.title);

  // Cancelled while empty: removed, the note before it opens
  a.cancelEdit();
  r.cancelled = { notes: a.notes.map((n) => n.title), open: a.currentNote?.title };

  // A template note has content, so leaving it keeps it
  a.createNoteFromTemplate('meeting');
  a.openNote(a.notes.find((n) => n.title === 'Kept'));
  r.template = a.notes.length;
  await new Promise((res) => setTimeout(res, 100));
  r.storedAtEnd = await stored();
  return r;
}

export const expected = {
  created: { notes: 1, listed: 1, stored: 1 },
  active: true,
  leftEmpty: 1,
  written: ['', 'Kept'],
  cancelled: { notes: ['Kept'], open: 'Kept' },
  template: 2,
  storedAtEnd: 2,
};
