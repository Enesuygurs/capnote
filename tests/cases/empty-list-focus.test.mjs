// A new note clears the search (or it would not show in the list); an empty list says there are
// no notes yet (with a way to write the first) or that none match; focus mode hides everything but
// the note and Escape leaves it
export async function run() {
  const a = window.app;
  const r = {};

  a.showWelcome();
  const empty = a.notesList.querySelector('.notes-list-empty');
  r.empty = {
    text: empty?.querySelector('p')?.textContent,
    button: !!empty?.querySelector('button'),
  };

  a.createNewNote();
  a.noteTitle.value = 'Note';
  a.richEditor.innerHTML = '<p>text</p>';
  a.saveNote();

  // A search that matches nothing, then a new note
  a.searchInput.value = 'zzz';
  a.searchNotes();
  r.noMatch = a.notesList.querySelector('.notes-list-empty')?.textContent.trim();
  a.createNewNote();
  r.searchCleared = a.searchInput.value;
  r.newListed = !!a.notesList.querySelector(`.note-item[data-note-id="${a.currentNote.id}"]`);

  // Focus mode
  a.focusModeBtn.click();
  r.focusOn = document.body.classList.contains('focus-mode');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  r.escLeaves = [document.body.classList.contains('focus-mode'), a.isEditorOpen()];
  a.focusModeBtn.click();
  a.cancelEdit();
  r.leftWithEditor = document.body.classList.contains('focus-mode');
  return r;
}

export const expected = {
  empty: { text: 'Henüz not yok', button: true },
  noMatch: 'Eşleşen not yok',
  searchCleared: '',
  newListed: true,
  focusOn: true,
  escLeaves: [false, true],
  leftWithEditor: false,
};
