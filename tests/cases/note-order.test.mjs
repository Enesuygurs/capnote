// Notes can be put in any order by dragging one onto another; the list then keeps the custom order

export async function run() {
  const a = window.app;
  for (const title of ['A', 'B', 'C']) {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = '<p>x</p>';
    a.saveNote(true);
  }
  const titles = () =>
    [...a.notesList.querySelectorAll('.note-item-title')].map((e) => e.textContent);
  const id = (title) => a.notes.find((n) => n.title === title).id;
  const before = titles();

  // A (now last) goes before C (first), then B goes after A
  await a.reorderNote(id('A'), id('C'), true);
  const first = titles();
  await a.reorderNote(id('B'), id('A'), false);
  const second = titles();

  // A new note comes first, the others keep their custom order
  a.createNewNote();
  a.noteTitle.value = 'D';
  a.richEditor.innerHTML = '<p>x</p>';
  a.saveNote(true);

  return {
    before,
    first,
    second,
    afterNew: titles(),
    sort: a.currentSort,
    saved: a.settings.noteSort,
    active: document.querySelector('.sort-option.active')?.dataset.value,
  };
}

export const expected = {
  before: ['C', 'B', 'A'],
  first: ['A', 'C', 'B'],
  second: ['A', 'B', 'C'],
  afterNew: ['D', 'A', 'B', 'C'],
  sort: 'manual',
  saved: 'manual',
  active: 'manual',
};
