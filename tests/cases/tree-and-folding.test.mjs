// The compact list (a setting) draws smaller rows as a tree: the folder arrow in the left gutter, no
// icons or counts, a line down the side of what is in a folder. A hovered row keeps showing. In the
// viewer and the Markdown preview a list item with items under it and a heading fold with an arrow;
// a folded heading hides what follows it up to the next heading of its level or a higher one, the
// folds of a note stay when it is shown again, and the note itself never changes.

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const r = {};

  // A hovered row is not hidden (a rule once put "display: none" on .nav-item:hover)
  const hoverRules = [...document.styleSheets]
    .flatMap((sheet) => {
      try {
        return [...sheet.cssRules];
      } catch {
        return [];
      }
    })
    .filter((rule) => /\.nav-item:hover|\.note-item:hover/.test(rule.selectorText || ''));
  r.hoverHides = hoverRules.some((rule) => rule.style.display === 'none');

  // The compact list
  const parent = { id: 'p1', name: 'Work', createdAt: new Date().toISOString(), expanded: true };
  const child = { ...parent, id: 'c1', name: 'Projects', parentId: 'p1' };
  a.folders.push(parent, child);
  const t = new Date().toISOString();
  a.notes.push({
    id: 'n1',
    title: 'Inside',
    content: '<p>x</p>',
    createdAt: t,
    updatedAt: t,
    folderId: 'c1',
    tags: [],
    formatting: a.getDefaultFormatting(),
    history: [],
  });
  a.updateFoldersList();
  const toggle = a.compactListToggle;
  toggle.checked = true;
  toggle.dispatchEvent(new Event('change'));
  await wait(50);
  const header = document.querySelector('.folder-item[data-folder-id="c1"]');
  const noteRow = document.querySelector('.note-item[data-note-id="n1"]');
  const box = document.querySelector('.folder-notes-container[data-folder-id="p1"]');
  r.compact = {
    setting: a.settings.compactList,
    bodyClass: document.body.classList.contains('compact-list'),
    rowHeights: [header.getBoundingClientRect().height, noteRow.getBoundingClientRect().height],
    arrow: getComputedStyle(header.querySelector('.nav-expand')).position,
    hidden: [
      getComputedStyle(header.querySelector('.nav-icon')).display,
      getComputedStyle(header.querySelector('.folder-count')).display,
      getComputedStyle(noteRow.querySelector('.nav-icon')).display,
    ],
    line: getComputedStyle(box).borderLeftWidth,
    // Names of one level line up: the folder's and the note's text start at the same x
    namesAligned:
      header.querySelector('.nav-text').getBoundingClientRect().left -
        document.querySelector('.folder-item[data-folder-id="c1"]').getBoundingClientRect().left ===
      noteRow.querySelector('.nav-text').getBoundingClientRect().left -
        noteRow.getBoundingClientRect().left,
  };
  toggle.checked = false;
  toggle.dispatchEvent(new Event('change'));
  r.compactOff = document.body.classList.contains('compact-list');

  // Folding in the viewer
  const md = [
    '## Features',
    '',
    '- [x] **Quick toggles**',
    '  - Night light',
    '- Single',
    '',
    '### Notes',
    '',
    'A paragraph.',
    '',
    '## Next',
    '',
    'Last.',
  ].join('\n');
  const note = {
    id: 'fold1',
    title: 'Fold',
    content: a.markdownToNoteHtml(md),
    createdAt: t,
    updatedAt: t,
    folderId: null,
    tags: [],
    formatting: a.getDefaultFormatting(),
    history: [],
  };
  a.notes.push(note);
  const original = note.content;
  a.selectNote(note);
  await wait(100);
  const v = a.viewerText;
  const shown = (el) => getComputedStyle(el).display !== 'none';
  const item = v.querySelector('li.foldable');
  const h3 = [...v.children].find((el) => el.tagName === 'H3');
  const h2 = [...v.children].find((el) => el.tagName === 'H2');
  r.arrows = {
    items: v.querySelectorAll('li.foldable').length,
    headings: v.querySelectorAll(':scope > h2.foldable, :scope > h3.foldable').length,
    plainItem: [...v.querySelectorAll('li')].some(
      (li) => !li.querySelector('ul') && li.querySelector(':scope > .fold-toggle')
    ),
  };
  item.querySelector(':scope > .fold-toggle').click();
  h3.querySelector(':scope > .fold-toggle').click();
  r.folded = {
    sublist: shown(item.querySelector(':scope > ul')),
    afterH3: [...v.children].filter((el) => !shown(el)).map((el) => el.textContent.trim()),
    expanded: item.querySelector(':scope > .fold-toggle').getAttribute('aria-expanded'),
  };
  h2.querySelector(':scope > .fold-toggle').click();
  r.h2Folded = [...v.children].map((el) => (shown(el) ? '' : 'x ') + el.tagName);
  a.displayNote(note);
  r.keptAfterRedraw = v.querySelectorAll('.is-folded').length;
  r.noteUnchanged = note.content === original;

  // The Markdown preview folds too
  a.renderMarkdownPreview('- a\n  - b\n\n# Head\n\ntext');
  r.preview = a.markdownPreview.querySelectorAll('.fold-toggle').length;
  return r;
}

export const expected = {
  hoverHides: false,
  compact: {
    setting: true,
    bodyClass: true,
    rowHeights: [26, 26],
    arrow: 'absolute',
    hidden: ['none', 'none', 'none'],
    line: '1px',
    namesAligned: true,
  },
  compactOff: false,
  arrows: { items: 1, headings: 3, plainItem: false },
  folded: { sublist: false, afterH3: ['A paragraph.'], expanded: 'false' },
  h2Folded: ['H2', 'x UL', 'x H3', 'x P', 'H2', 'P'],
  keptAfterRedraw: 3,
  noteUnchanged: true,
  preview: 2,
};
