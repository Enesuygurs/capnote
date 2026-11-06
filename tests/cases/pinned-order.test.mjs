// Pinned notes and folders can be put in order among themselves (the root list: its pinned notes
// and folders together; a folder: its pinned notes); nothing unpinned goes among them, and one
// pinned later comes after them. The favorite hearts are the heart's red.

export async function run() {
  const a = window.app;
  const t = new Date().toISOString();
  const note = (id, extra = {}) => {
    const n = {
      id,
      title: id,
      content: '<p>x</p>',
      createdAt: t,
      updatedAt: t,
      folderId: null,
      tags: [],
      formatting: a.getDefaultFormatting(),
      history: [],
      ...extra,
    };
    a.notes.push(n);
    return n;
  };
  const r = {};
  const n1 = note('One');
  const n2 = note('Two');
  const n3 = note('Three', { isFavorite: true });
  const loose = note('Loose');
  const box = { id: 'box', name: 'Box', createdAt: t, expanded: true };
  a.folders.push(box);
  const inBox1 = note('In1', { folderId: 'box' });
  const inBox2 = note('In2', { folderId: 'box' });
  [n1, n2, n3, box, inBox1, inBox2].forEach((item, i) => {
    a.setPinned(item, true);
    item.pinnedAt = new Date(Date.parse(t) + i).toISOString();
  });
  a.updateFoldersList();
  // A row's name: a folder's own name, or a note's title
  const rowName = (el) =>
    el.classList.contains('folder-container')
      ? el.querySelector(':scope > .folder-item .nav-text').textContent
      : el.querySelector('.note-item-title')?.textContent;
  const top = (count = 4) => [...a.notesList.children].slice(0, count).map(rowName);
  r.start = top();

  // The folder before the first note; then "One" after "Three"
  await a.placeAmongPinned({ folder: box }, { note: n1 }, true);
  r.folderFirst = top();
  await a.placeAmongPinned({ note: n1 }, { note: n3 }, false);
  r.oneLast = top();

  // Not among the pinned: an unpinned note, or a pinned note of a folder in the root group
  r.refused = [
    a.canPlaceAmongPinned(null, { note: n2 }),
    a.canPlaceAmongPinned({ note: inBox1 }, { note: n2 }),
    a.canPlaceAmongPinned({ note: n2 }, { note: loose }),
  ];

  // In a folder: its pinned notes among themselves
  await a.placeAmongPinned({ note: inBox2 }, { note: inBox1 }, true);
  r.inFolder = [
    ...document.querySelectorAll('.folder-notes-container[data-folder-id="box"] .note-item-title'),
  ].map((el) => el.textContent);

  // Pinned later: after the ordered ones
  a.setPinned(loose, true);
  a.updateNotesList();
  r.newPin = top(5);

  // The heart
  const heart = a.notesList.querySelector('.note-item-favorite');
  a.applyTheme(false);
  r.heartLight = getComputedStyle(heart).color;
  a.applyTheme(true);
  r.heartDark = getComputedStyle(heart).color;
  a.applyTheme(false);
  return r;
}

export const expected = {
  start: ['One', 'Two', 'Three', 'Box'],
  folderFirst: ['Box', 'One', 'Two', 'Three'],
  oneLast: ['Box', 'Two', 'Three', 'One'],
  refused: [false, false, false],
  inFolder: ['In2', 'In1'],
  newPin: ['Box', 'Two', 'Three', 'One', 'Loose'],
  heartLight: 'rgb(217, 4, 41)',
  heartDark: 'rgb(255, 46, 76)',
};
