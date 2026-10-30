// Selection actions: dropping a selection on a folder moves all of it, the menu shows only what
// fits the selection, several notes can be pinned, folders can be pinned above the notes, and a
// click on an empty part of the list clears the selection

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const make = (title) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = '<p>x</p>';
    a.saveNote(true);
    return a.currentNote;
  };
  const n1 = make('N1');
  const n2 = make('N2');
  const n3 = make('N3');
  a.showWelcome();
  a.currentNote = null;
  a.folders.push({ id: 'fa', name: 'A', color: '#3b82f6', expanded: true });
  a.folders.push({ id: 'fb', name: 'B', color: '#ef4444', expanded: true });
  a.updateNotesList();
  a.updateFoldersList();

  // Dropping a selected note on a folder moves the whole selection
  a.selectedNoteIds = new Set([n1.id, n2.id]);
  a.draggedNoteId = n1.id;
  const header = document.querySelector('.folder-item[data-folder-id="fa"]');
  header.dispatchEvent(
    new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: new DataTransfer() })
  );
  a.draggedNoteId = null;
  await wait(50);
  const moved = [n1.folderId, n2.folderId, n3.folderId];

  const visible = (action) =>
    !a.selectionMenu.querySelector(`[data-action="${action}"]`).hidden &&
    getComputedStyle(a.selectionMenu.querySelector(`[data-action="${action}"]`)).display !== 'none';

  // Notes in a folder: "take out" shows; after it, it does not
  a.markSelection();
  a.showSelectionMenuIfSelected(10, 10, 'note', n1.id);
  const unfileBefore = visible('unfile');
  await a.unfileSelection();
  a.showSelectionMenuIfSelected(10, 10, 'note', n1.id);
  const unfileAfter = visible('unfile');

  // Pin both notes at once
  await a.pinSelection();
  const pinned = [n1.isPinned, n2.isPinned];

  // Duplicate both at once: two new notes, the originals stay
  const countBefore = a.notes.length;
  a.selectionMenu.querySelector('[data-action="duplicate"]').click();
  const duplicated = a.notes.length - countBefore;
  const copyTitles = a.notes
    .slice(0, 2)
    .map((n) => n.title)
    .sort();

  // Only folders selected: no note actions
  a.selectedNoteIds = new Set();
  a.selectedFolderIds = new Set(['fa', 'fb']);
  a.showSelectionMenuIfSelected(10, 10, 'folder', 'fa');
  const folderOnly = {
    unfile: visible('unfile'),
    favorite: visible('favorite'),
    pinFolders: visible('pinFolders'),
  };
  a.hideSelectionMenu();

  // Pin a folder: it moves above the notes
  await a.togglePinFolders(['fb']);
  const pinnedFolderOnTop = !!a.pinnedFoldersList.querySelector('[data-folder-id="fb"]');

  // A click on an empty part of the list clears the selection
  a.sidebarContent.querySelector('.sidebar-nav').click();
  const cleared = !a.hasSelection;

  return {
    moved,
    unfileBefore,
    unfileAfter,
    pinned,
    duplicated,
    copyTitles,
    folderOnly,
    pinnedFolderOnTop,
    cleared,
  };
}

export const expected = {
  moved: ['fa', 'fa', null],
  unfileBefore: true,
  unfileAfter: false,
  pinned: [true, true],
  duplicated: 2,
  copyTitles: ['N1 (Kopya)', 'N2 (Kopya)'],
  folderOnly: { unfile: false, favorite: false, pinFolders: true },
  pinnedFolderOnTop: true,
  cleared: true,
};
