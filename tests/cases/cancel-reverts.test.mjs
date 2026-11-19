// With automatic saving: the button is Done and the line under the title shows how the saving
// goes ("Kaydediliyor…" while a change waits, then "Kaydedildi"); the note's text cannot be
// selected outside the editor;
// Cancel takes a note back to how it was when its editing began, the automatic saves since
// included (the text left behind stays in its history); Done keeps the changes

export async function run() {
  const a = window.app;
  const r = {};
  a.createNewNote();
  a.noteTitle.value = 'Plan';
  a.richEditor.innerHTML = '<p>ilk</p>';
  a.saveNote();
  const note = a.currentNote;

  r.viewerSelect = getComputedStyle(a.viewerText).userSelect;
  await a.editCurrentNote();
  const status = () => a.saveIndicator.textContent.trim();
  r.button = a.saveNoteBtn.textContent.trim();
  a.richEditor.innerHTML = '<p>ikinci</p>';
  a.trackContentChanges();
  r.saving = status();
  a.saveNote(true); // the automatic save
  r.savedAgain = [status(), a.saveNoteBtn.textContent.trim()];
  a.cancelEdit();
  r.reverted = note.content;
  r.inHistory = note.history.some((h) => h.version?.content === '<p>ikinci</p>');

  await a.editCurrentNote();
  a.richEditor.innerHTML = '<p>üçüncü</p>';
  a.trackContentChanges();
  a.saveNoteBtn.click();
  r.doneKeeps = [note.content, a.isViewerOpen()];

  // Without automatic saving: Save, and no status
  a.settings.autoSave = false;
  await a.editCurrentNote();
  r.offButton = a.saveNoteBtn.textContent.trim();
  return r;
}

export const expected = {
  viewerSelect: 'none',
  button: 'Bitti',
  saving: 'Kaydediliyor…',
  savedAgain: ['Kaydedildi', 'Bitti'],
  reverted: '<p>ilk</p>',
  inHistory: true,
  doneKeeps: ['<p>üçüncü</p>', true],
  offButton: 'Kaydet',
};
