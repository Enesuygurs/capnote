// While searching, a closed folder holding results is shown open (its saved state unchanged) and
// closes again when the search is cleared
export async function run() {
  const a = window.app;
  a.folders.push({ id: 'f1', name: 'Work', color: '#3b82f6', expanded: false });
  a.createNewNote();
  a.noteTitle.value = 'Alpha plan';
  a.saveNote(true);
  a.currentNote.folderId = 'f1';
  a.saveNotes();
  a.updateNotesList();
  a.updateFoldersList();
  const open = () =>
    document.querySelector('.folder-notes-container[data-folder-id="f1"]').style.display ===
    'block';
  const shown = () =>
    !!document.querySelector('.folder-notes-container[data-folder-id="f1"] .note-item');
  const search = (q) => {
    a.searchInput.value = q;
    a.searchNotes();
  };
  const r = { closedAtStart: !open() };
  search('alpha');
  r.whileSearching = { open: open(), noteShown: shown(), saved: a.folders[0].expanded };
  search('');
  r.afterSearch = { open: open(), saved: a.folders[0].expanded };

  return r;
}

export const expected = {
  closedAtStart: true,
  whileSearching: { open: true, noteShown: true, saved: false },
  afterSearch: { open: false, saved: false },
};
