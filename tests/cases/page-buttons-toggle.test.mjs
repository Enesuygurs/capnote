// The tags and archive buttons open their page, and a second click goes back to the screen they
// were opened from (a note, the editor, another page or the home page), the button no longer active
export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Open note';
  a.saveNote();
  const where = () =>
    ['welcomeScreen', 'noteViewer', 'noteEditor', 'tagsScreen', 'archiveScreen', 'todosScreen']
      .filter((key) => !a[key].classList.contains('hidden'))
      .join();
  const active = (btn) => btn.classList.contains('active');
  const r = {};

  // From an open note
  a.archiveNavBtn.click();
  r.open = [where(), active(a.archiveNavBtn)];
  a.archiveNavBtn.click();
  r.back = [where(), active(a.archiveNavBtn), a.currentNote.title];

  // From the editor: the edit is still there
  await a.editCurrentNote();
  a.noteTitle.value = 'Being edited';
  a.tagsNavBtn.click();
  r.tagsOpen = [where(), active(a.tagsNavBtn)];
  a.tagsNavBtn.click();
  r.backToEditor = [where(), active(a.tagsNavBtn), a.noteTitle.value];
  a.cancelEdit();

  // From another page, and from the archive to the tags page and back
  a.showTodosScreen();
  a.archiveNavBtn.click();
  a.tagsNavBtn.click();
  r.switched = [where(), active(a.archiveNavBtn), active(a.tagsNavBtn)];
  a.tagsNavBtn.click();
  r.backToArchive = where();

  // From the home page
  a.showWelcome();
  a.archiveNavBtn.click();
  a.archiveNavBtn.click();
  r.home = where();
  return r;
}

export const expected = {
  open: ['archiveScreen', true],
  back: ['noteViewer', false, 'Open note'],
  tagsOpen: ['tagsScreen', true],
  backToEditor: ['noteEditor', false, 'Being edited'],
  switched: ['tagsScreen', false, true],
  backToArchive: 'archiveScreen',
  home: 'welcomeScreen',
};
