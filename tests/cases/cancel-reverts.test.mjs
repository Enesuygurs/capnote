// With automatic saving: the editor shows when the note was saved and has Done in place of Save;
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

  await a.editCurrentNote();
  r.button = a.saveNoteBtn.textContent.trim();
  r.status = a.saveStatus.textContent.startsWith('Kaydedildi');
  a.richEditor.innerHTML = '<p>ikinci</p>';
  a.trackContentChanges();
  r.saving = a.saveStatus.textContent;
  a.saveNote(true); // the automatic save
  r.savedAgain = a.saveStatus.textContent.startsWith('Kaydedildi');
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
  r.offStatusHidden = a.saveStatus.classList.contains('hidden');
  return r;
}

export const expected = {
  button: 'Bitti',
  status: true,
  saving: 'Kaydediliyor…',
  savedAgain: true,
  reverted: '<p>ilk</p>',
  inHistory: true,
  doneKeeps: ['<p>üçüncü</p>', true],
  offButton: 'Kaydet',
  offStatusHidden: true,
};
