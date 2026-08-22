// The Today filter only lists notes created today

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Fresh';
  a.richEditor.innerHTML = '<p>x</p>';
  a.saveNote(true);
  a.notes.push({ ...a.notes[0], id: 999, title: 'Old', createdAt: '2020-01-01T00:00:00.000Z' });
  a.changeFilter('today');
  return [...a.notesList.querySelectorAll('.note-item-title')].map((e) => e.textContent);
}

export const expected = ['Fresh'];
