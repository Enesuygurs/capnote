// The tags page lists every tag with its count (tags match without case); choosing one filters the
// sidebar list and lists its notes; a tag on a note opens the page; the filter can be removed

export async function run() {
  const a = window.app;
  const make = (title, tags, folderId = null) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = '<p>x</p>';
    a.tags = tags;
    a.saveNote(true);
    a.currentNote.folderId = folderId;
    return a.currentNote;
  };
  a.folders.push({ id: 'ft', name: 'Box', color: '#3b82f6', expanded: true });
  make('One', ['Work', 'home']);
  const two = make('Two', ['work']);
  make('Three', ['Work'], 'ft');
  make('Four', []);
  a.updateFoldersList();

  a.tagsNavBtn.click();
  const cloud = [...a.tagsCloud.querySelectorAll('.tag-chip')].map(
    (c) =>
      c.querySelector('.tag-chip-name').textContent +
      ':' +
      c.querySelector('.tag-chip-count').textContent
  );
  const navActive = a.tagsNavBtn.classList.contains('active');

  // Choose "work"
  a.tagsCloud.querySelector('.tag-chip').click();
  const pageNotes = [...a.tagNotesList.querySelectorAll('.list-card-title')]
    .map((t) => t.textContent)
    .sort();
  const rootList = [...a.notesList.querySelectorAll('.note-item-title')]
    .map((t) => t.textContent)
    .sort();
  const folderShown = !!document.querySelector('.folder-item[data-folder-id="ft"]');
  const chip = !a.tagFilter.classList.contains('hidden') && a.tagFilter.textContent.trim();

  // A note row on the page opens it
  a.tagNotesList.querySelector('.tag-note').click();
  const opened = !a.noteViewer.classList.contains('hidden');

  // A tag on the note opens the tags page with that tag chosen
  a.selectNote(two);
  a.viewerTags.querySelector('.viewer-tag').click();
  const fromViewer = a.tagsCloud.querySelector('.tag-chip.active .tag-chip-name')?.textContent;

  // Removing the filter brings every note back
  a.clearTagFilterBtn.click();
  const afterClear = a.notesList.querySelectorAll('.note-item').length;
  const chipHidden = a.tagFilter.classList.contains('hidden');

  return {
    cloud,
    navActive,
    pageNotes,
    rootList,
    folderShown,
    chip,
    opened,
    fromViewer,
    afterClear,
    chipHidden,
  };
}

export const expected = {
  cloud: ['Work:3', 'home:1'],
  navActive: true,
  pageNotes: ['One', 'Three', 'Two'],
  rootList: ['One', 'Two'],
  folderShown: true,
  chip: 'Work',
  opened: true,
  fromViewer: 'Work',
  afterClear: 3,
  chipHidden: true,
};
