// In the custom order a folder can be dragged among the notes of the root list: dropped before or
// after a note it stays there (the list switches to the custom order if it was in another), notes
// dragged around keep the folder's place, and the order is kept when the list is drawn again
export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const title of ['C', 'B', 'A']) {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = '<p>x</p>';
    a.saveNote(true);
  }
  a.folders.push({ id: 'f1', name: 'Klasör', color: '#3b82f6' });
  await a.saveFolders();
  a.changeSorting('date-desc');
  a.updateFoldersList();

  const order = () =>
    [...a.notesList.children]
      .map((el) =>
        el.classList.contains('note-item')
          ? el.querySelector('.note-item-title').textContent
          : el.querySelector('.folder-item .nav-text')?.textContent || el.className
      )
      .filter(Boolean);
  const row = (title) =>
    [...a.notesList.querySelectorAll('.note-item')].find(
      (r) => r.querySelector('.note-item-title').textContent === title
    );
  const drag = (source, target, before) => {
    const dt = new DataTransfer();
    source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    const rect = target.getBoundingClientRect();
    const y = before ? rect.top + 2 : rect.bottom - 2;
    for (const type of ['dragover', 'drop']) {
      target.dispatchEvent(
        new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, clientY: y })
      );
    }
    source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }));
  };
  const r = {
    before: { sort: a.currentSort, list: order(), inFoldersList: a.foldersList.children.length },
  };

  // The folder, dropped after A, goes between A and B
  drag(document.querySelector('.folder-item[data-folder-id="f1"]'), row('A'), false);
  await wait(150);
  r.folderPlaced = {
    sort: a.currentSort,
    list: order(),
    inFoldersList: a.foldersList.children.length,
  };

  // C dragged before A: the folder keeps its place after A
  drag(row('C'), row('A'), true);
  await wait(150);
  r.noteMoved = order();

  // Drawn again from the stored order
  a.updateNotesList();
  a.updateFoldersList();
  r.redrawn = order();
  r.stored = a.folders.find((f) => f.id === 'f1').order;
  return r;
}

export const expected = {
  before: { sort: 'date-desc', list: ['A', 'B', 'C'], inFoldersList: 1 },
  folderPlaced: { sort: 'manual', list: ['A', 'Klasör', 'B', 'C'], inFoldersList: 0 },
  noteMoved: ['C', 'A', 'Klasör', 'B'],
  redrawn: ['C', 'A', 'Klasör', 'B'],
  stored: 2,
};
