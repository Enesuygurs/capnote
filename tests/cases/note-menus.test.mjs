// Note menus do not pile up, and list updates skipped during a resize are applied afterwards

export async function run() {
  const a = window.app;
  for (let i = 0; i < 5; i++) {
    a.createNewNote();
    a.noteTitle.value = 'M' + i;
    a.richEditor.innerHTML = '<p>x</p>';
    a.saveNote(true);
  }
  const openMenu = () => {
    document.querySelector('.note-item .more-options-btn').click();
  };
  for (let i = 0; i < 10; i++) {
    openMenu();
    document.body.click();
    a.updateNotesList();
  }
  const menusInBody = document.querySelectorAll('body > .note-options-menu').length;
  openMenu();
  const reopened = !!document.querySelector('body > .note-options-menu:not(.hidden)');
  document.body.click();
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
  return { menusInBody, reopened, duringResize, afterResize };
}

export const expected = {
  menusInBody: 0,
  reopened: true,
  duringResize: false,
  afterResize: true,
};
