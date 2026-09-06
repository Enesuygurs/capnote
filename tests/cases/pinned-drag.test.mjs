// Pinned notes and folders cannot be dragged: the drag is cancelled and the row shakes, without
// replaying its appear animation (which blinked the row out)

export async function run() {
  const a = window.app;
  const make = (title) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = '<p>x</p>';
    a.saveNote(true);
    return a.currentNote;
  };
  const pinned = make('Pinned');
  const loose = make('Loose');
  pinned.isPinned = true;
  a.folders.push({ id: 'pf', name: 'Pinned folder', color: '#3b82f6', isPinned: true });
  a.folders.push({ id: 'lf', name: 'Loose folder', color: '#ef4444' });
  a.updateNotesList();
  a.updateFoldersList();

  const tryDrag = (el) => {
    const event = new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer: new DataTransfer(),
    });
    el.dispatchEvent(event);
    el.dispatchEvent(new DragEvent('dragend', { bubbles: true }));
    return {
      refused: event.defaultPrevented,
      shakes: el.classList.contains('shake'),
      appearsAgain: el.classList.contains('fade-in') && el.classList.contains('shake'),
    };
  };
  const note = (n) => document.querySelector(`.note-item[data-note-id="${n.id}"]`);
  const folder = (id) => document.querySelector(`.folder-item[data-folder-id="${id}"]`);

  // A selection drag leaves its pinned notes behind
  a.selectedNoteIds = new Set([pinned.id, loose.id]);
  const dragged = a.draggedNoteIds(loose.id);
  a.selectedNoteIds = new Set();

  return {
    pinnedNote: tryDrag(note(pinned)),
    looseNote: tryDrag(note(loose)),
    pinnedFolder: tryDrag(folder('pf')),
    looseFolder: tryDrag(folder('lf')),
    draggedOnlyLoose: dragged.length === 1 && dragged[0] === loose.id,
  };
}

export const expected = {
  pinnedNote: { refused: true, shakes: true, appearsAgain: false },
  looseNote: { refused: false, shakes: false, appearsAgain: false },
  pinnedFolder: { refused: true, shakes: true, appearsAgain: false },
  looseFolder: { refused: false, shakes: false, appearsAgain: false },
  draggedOnlyLoose: true,
};
