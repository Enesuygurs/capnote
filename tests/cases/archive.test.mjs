// Archiving keeps a note out of the list, its search and filters (and unpins it); the archive page
// lists it to open or bring back, the viewer shows that it is archived, several selected notes can
// be archived at once, and Markdown export carries it
export async function run() {
  const a = window.app;
  const mk = (title) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = '<p>text</p>';
    a.saveNote();
    return a.currentNote;
  };
  const listed = () =>
    [...a.notesList.querySelectorAll('.note-item-title')].map((e) => e.textContent).sort();
  const one = mk('One');
  mk('Two');
  const three = mk('Three');
  await a.togglePin(one.id);
  const r = {};

  // From the note's menu
  a.showNoteContextMenu(10, 10, one.id);
  a.noteContextMenu.querySelector('[data-action="archive"]').click();
  await new Promise((res) => setTimeout(res, 50));
  r.archived = { flag: one.isArchived, pinned: one.isPinned, listed: listed() };
  a.searchInput.value = 'one';
  a.searchNotes();
  r.searchFinds = listed();
  a.searchInput.value = '';
  a.searchNotes();

  // The archive page
  a.archiveNavBtn.click();
  r.page = {
    shown: !a.archiveScreen.classList.contains('hidden'),
    cards: [...a.archiveList.querySelectorAll('.list-card-title')].map((e) => e.textContent),
  };
  a.archiveList.querySelector('.archive-open').click();
  r.viewer = {
    open: a.currentNote.title,
    badge: !a.viewerArchived.classList.contains('hidden'),
    button: a.archiveViewBtn.title,
  };
  a.archiveViewBtn.click();
  await new Promise((res) => setTimeout(res, 50));
  r.unarchived = {
    flag: one.isArchived,
    listed: listed(),
    badge: a.viewerArchived.classList.contains('hidden'),
  };

  // Several at once from the selection menu
  a.selectedNoteIds = new Set([one.id, three.id]);
  a.markSelection();
  a.showSelectionMenuIfSelected(10, 10, 'note', one.id);
  a.selectionMenu.querySelector('[data-action="archive"]').click();
  await new Promise((res) => setTimeout(res, 50));
  r.selection = listed();
  a.showArchiveScreen();
  r.emptyAfter = a.archiveList.querySelectorAll('.archive-note').length;
  a.archiveList.querySelectorAll('.archive-restore').forEach((b) => b.click());
  await new Promise((res) => setTimeout(res, 50));
  r.allBack = { listed: listed(), empty: !!a.archiveList.querySelector('.empty-state') };

  // Markdown carries it
  three.isArchived = true;
  r.markdown = a.noteToMarkdown(three).includes('archived: true');
  return r;
}

export const expected = {
  archived: { flag: true, pinned: false, listed: ['Three', 'Two'] },
  searchFinds: [],
  page: { shown: true, cards: ['One'] },
  viewer: { open: 'One', badge: true, button: 'Arşivden çıkar' },
  unarchived: { flag: false, listed: ['One', 'Three', 'Two'], badge: true },
  selection: ['Two'],
  emptyAfter: 2,
  allBack: { listed: ['One', 'Three', 'Two'], empty: true },
  markdown: true,
};
