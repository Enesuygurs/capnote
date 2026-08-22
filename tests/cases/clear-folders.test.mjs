// Deleting all folders keeps their notes and moves them out of the folders

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'In folder';
  a.richEditor.innerHTML = '<p>x</p>';
  a.saveNote(true);
  a.createNewNote();
  a.noteTitle.value = 'Loose';
  a.richEditor.innerHTML = '<p>y</p>';
  a.saveNote(true);
  a.folderNameInput.value = 'F1';
  await a.createFolder();
  const f = a.folders[0];
  const n = a.notes.find((x) => x.title === 'In folder');
  await a.moveNoteToFolder(n.id, f.id);
  const before = a.notes.length;
  await a.clearAllFolders();
  return {
    before,
    after: a.notes.length,
    folders: a.folders.length,
    movedNoteFolder: a.notes.find((x) => x.title === 'In folder')?.folderId,
    listed: [...a.notesList.querySelectorAll('.note-item-title')].map((e) => e.textContent),
  };
}

export const expected = {
  before: 2,
  after: 2,
  folders: 0,
  movedNoteFolder: null,
  listed: ['Loose', 'In folder'],
};
