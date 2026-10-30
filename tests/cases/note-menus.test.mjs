// The note context menu opens on right-click, follows the note's state and runs its actions;
// list updates skipped during a resize are applied afterwards

export async function run() {
  const a = window.app;
  for (let i = 0; i < 5; i++) {
    a.createNewNote();
    a.noteTitle.value = 'M' + i;
    a.richEditor.innerHTML = '<p>x</p>';
    a.saveNote(true);
  }
  const menu = document.getElementById('noteContextMenu');
  const rightClick = (el) =>
    el.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 200 })
    );
  const firstRow = () => a.notesList.querySelector('.note-item');
  const label = (action) => menu.querySelector(`[data-action="${action}"] span`).textContent;

  rightClick(firstRow());
  const opened = !menu.classList.contains('hidden');
  const before = label('favorite');
  const id = firstRow().dataset.noteId;
  menu.querySelector('[data-action="favorite"]').click();
  await new Promise((r) => setTimeout(r, 50));
  const closedAfterAction = menu.classList.contains('hidden');
  const favorite = a.notes.find((n) => n.id === id).isFavorite;
  const heart = !!a.notesList.querySelector(`[data-note-id="${id}"] .note-item-favorite`);
  rightClick(a.notesList.querySelector(`[data-note-id="${id}"]`));
  const after = label('favorite');
  document.body.click();
  const closedByClick = menu.classList.contains('hidden');
  const menus = document.querySelectorAll('#noteContextMenu').length;

  // a list update during a resize is applied once the resize ends
  window.dispatchEvent(new Event('resize'));
  a.notes[0].title = 'Renamed during resize';
  a.updateNotesList();
  const duringResize = [...a.notesList.querySelectorAll('.note-item-title')].some(
    (e) => e.textContent === 'Renamed during resize'
  );
  await new Promise((r) => setTimeout(r, 250));
  const afterResize = [...a.notesList.querySelectorAll('.note-item-title')].some(
    (e) => e.textContent === 'Renamed during resize'
  );
  return {
    opened,
    before,
    closedAfterAction,
    favorite,
    heart,
    after,
    closedByClick,
    menus,
    duringResize,
    afterResize,
  };
}

export const expected = {
  opened: true,
  before: 'Favorilere ekle',
  closedAfterAction: true,
  favorite: true,
  heart: true,
  after: 'Favorilerden çıkar',
  closedByClick: true,
  menus: 1,
  duringResize: false,
  afterResize: true,
};
