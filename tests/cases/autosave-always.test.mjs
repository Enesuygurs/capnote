// Notes save themselves, as in Apple Notes: the editor has no Save, Cancel or status, there is no
// setting to turn saving off; Escape and the reading-view button leave the editor with the writing
// kept, and a new note left empty goes

export async function run() {
  const a = window.app;
  const r = {};
  r.noButtons = ['saveNoteBtn', 'cancelNoteBtn', 'saveIndicator', 'autoSaveToggle'].every(
    (id) => !document.getElementById(id)
  );
  r.noSetting = !('autoSave' in a.settings);

  a.createNewNote();
  a.noteTitle.value = 'Plan';
  a.richEditor.innerHTML = '<p>ilk</p>';
  a.trackContentChanges();

  a.richEditor.innerHTML = '<p>ikinci</p>';
  a.trackContentChanges();
  a.readViewBtn.click();
  r.readView = [a.notes[0].content, a.isViewerOpen()];

  await a.editCurrentNote();
  a.richEditor.innerHTML = '<p>üçüncü</p>';
  a.trackContentChanges();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  r.escape = [a.notes[0].content, a.isViewerOpen()];

  // The app quitting: what the editor holds is saved first
  await a.editCurrentNote();
  a.richEditor.innerHTML = '<p>dördüncü</p>';
  a.trackContentChanges();
  await a.saveBeforeQuit();
  const stored = (await window.electronAPI.storage.load()).data.notes[0].content;
  r.beforeQuit = stored;

  a.createNewNote();
  a.readViewBtn.click();
  r.emptyGone = a.notes.length;
  return r;
}

export const expected = {
  noButtons: true,
  noSetting: true,
  readView: ['<p>ikinci</p>', true],
  escape: ['<p>üçüncü</p>', true],
  beforeQuit: '<p>dördüncü</p>',
  emptyGone: 1,
};
