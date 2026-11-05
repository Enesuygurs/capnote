// The note graph: notes and their links (each pair once, from either side; [[Title]] in Markdown
// notes too), without archived notes and links to missing notes. Lone notes show with "All", a
// note opens with a click, and with no links the page says how to make one.

export async function seed() {
  // The seed runs in the page on its own, so its helpers are inside it
  const at = new Date().toISOString();
  const note = (id, title, content = '', extra = {}) => ({
    id,
    title,
    content,
    createdAt: at,
    updatedAt: at,
    tags: [],
    ...extra,
  });
  const link = (id) => `<p><a class="note-link" data-note-id="${id}" href="#">x</a></p>`;
  await window.electronAPI.storage.save('notes', [
    note('a', 'Plan', link('b') + link('c') + link('a') + link('gone')),
    note('b', 'Bütçe', link('a')),
    note('c', 'Tarifler'),
    note('d', 'Markdown notu', 'Bkz. [[plan]] ve [[Yok]]', { isMarkdown: true }),
    note('e', 'Arşivde', link('a'), { isArchived: true }),
    note('f', 'Yalnız'),
  ]);
  return 'seeded';
}

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ids = (list) => list.map((x) => x.id).sort();
  const pairs = (list) => list.map((l) => [l.source, l.target].sort().join('-')).sort();

  const linked = a.noteGraph();
  const all = a.noteGraph({ unlinked: true });
  const data = {
    nodes: ids(linked.nodes),
    links: pairs(linked.links),
    degreeA: linked.nodes.find((n) => n.id === 'a').degree,
    allNodes: ids(all.nodes),
  };

  a.graphNavBtn.click();
  await wait(200);
  const dots = () => [...a.graphCanvas.querySelectorAll('.graph-node')];
  const inside = (el) => {
    const r = el.getBoundingClientRect();
    const box = a.graphCanvas.getBoundingClientRect();
    return r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom;
  };
  const screen = {
    shown: a.currentScreen,
    buttonActive: a.graphNavBtn.classList.contains('active'),
    subtitle: a.graphSubtitle.textContent,
    dots: dots().length,
    lines: a.graphCanvas.querySelectorAll('.graph-link').length,
    allInside: dots().every(inside),
  };

  a.graphRangeTabs.querySelector('[data-show="all"]').click();
  const withAll = {
    dots: dots().length,
    alone: a.graphCanvas.querySelectorAll('.graph-node.is-alone').length,
  };

  // Hover brings out the note and its neighbours
  const dotOf = (id) => dots().find((d) => d.dataset.noteId === id);
  dotOf('c').dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  const hover = dots()
    .filter((d) => d.classList.contains('is-near'))
    .map((d) => d.dataset.noteId)
    .sort();
  dotOf('c').dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));

  // A click opens the note
  const target = dotOf('b');
  const opts = { bubbles: true, button: 0, pointerId: 1, clientX: 10, clientY: 10 };
  target.dispatchEvent(new PointerEvent('pointerdown', opts));
  target.dispatchEvent(new PointerEvent('pointerup', opts));
  await wait(100);
  const opened = { screen: a.currentScreen, note: a.currentNote?.id };

  // With no links the page says how to make one
  a.notes = a.notes.filter((n) => n.id === 'c' || n.id === 'f');
  a.showNoteGraph();
  a.graphRangeTabs.querySelector('[data-show="linked"]').click();
  const empty = {
    text: a.graphCanvas.querySelector('.graph-empty')?.textContent.trim(),
    subtitle: a.graphSubtitle.textContent,
  };
  return { data, screen, withAll, hover, opened, empty };
}

export const expected = {
  data: {
    nodes: ['a', 'b', 'c', 'd'],
    links: ['a-b', 'a-c', 'a-d'],
    degreeA: 3,
    allNodes: ['a', 'b', 'c', 'd', 'f'],
  },
  screen: {
    shown: 'graph',
    buttonActive: true,
    subtitle: '4 not · 3 bağlantı',
    dots: 4,
    lines: 3,
    allInside: true,
  },
  withAll: { dots: 5, alone: 1 },
  hover: ['a', 'c'],
  opened: { screen: 'viewer', note: 'b' },
  empty: { text: /henüz bağlantı yok/, subtitle: '0 not · 0 bağlantı' },
};
