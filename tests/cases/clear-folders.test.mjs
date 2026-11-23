// "Delete all content" deletes the notes, folders and templates and keeps the settings

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'In folder';
  a.richEditor.innerHTML = '<p>x</p>';
  a.saveNote(true);
  a.folderNameInput.value = 'F1';
  await a.createFolder();
  a.settings.compactList = true;
  const before = { notes: a.notes.length, folders: a.folders.length };
  await a.clearAllContent({ keepSettings: true });
  return {
    before,
    notes: a.notes.length,
    folders: a.folders.length,
    settingKept: a.settings.compactList,
  };
}

export const expected = {
  before: { notes: 1, folders: 1 },
  notes: 0,
  folders: 0,
  settingKept: true,
};
