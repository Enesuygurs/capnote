// The note map (a setting, off at first): with it on, a column at the right of the note's text shows
// the note small with a box over the part on screen; a click on the map scrolls the note there; it
// follows the note into the editor and redraws what is typed; the text keeps clear of it; off, it
// is gone.

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const m = () => a.minimap;
  const shown = () => !m().map.classList.contains('hidden');
  const r = { offAtFirst: !a.settings.noteMinimap };

  a.createNewNote();
  a.noteTitle.value = 'Harita';
  a.richEditor.innerHTML = Array.from(
    { length: 30 },
    (_, i) => `<h2>Bölüm ${i + 1}</h2><p>${'Bir paragraf metni. '.repeat(20)}</p>`
  ).join('');
  a.saveNote(true);
  a.finishEditing();
  await wait(300);
  r.hiddenWhileOff = !shown();

  a.noteMinimapToggle.checked = true;
  a.noteMinimapToggle.dispatchEvent(new Event('change'));
  await wait(300);
  r.saved = a.settings.noteMinimap === true;
  r.shownInViewer = shown() && m().target?.el === a.viewerText;
  r.copiesTheNote = m().inner.querySelectorAll('h2').length;
  r.textKeepsClear = getComputedStyle(a.viewerText).marginRight;

  // A click in the lower part of the map scrolls the note down
  const box = m().map.getBoundingClientRect();
  m().map.dispatchEvent(
    new MouseEvent('mousedown', {
      bubbles: true,
      button: 0,
      clientX: box.left + 40,
      clientY: box.top + box.height * 0.8,
    })
  );
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  await wait(100);
  r.clickScrolls = m().host.scrollTop > 0;
  const view = m().view.getBoundingClientRect();
  r.boxFollows = view.top > box.top + box.height * 0.3;

  // In the editor: the map is the editor's text, and what is typed shows on it
  a.editCurrentNote();
  await wait(400);
  r.shownInEditor = shown() && m().target?.el === a.richEditor;
  a.richEditor.insertAdjacentHTML('beforeend', '<h2>Yeni bölüm</h2>');
  a.richEditor.dispatchEvent(new Event('input', { bubbles: true }));
  await wait(400);
  r.redraws = m().inner.querySelectorAll('h2').length;
  a.finishEditing();
  await wait(200);

  // Elsewhere it hides; off, it is gone
  a.showWelcome();
  await wait(200);
  r.hiddenElsewhere = !shown();
  a.selectNote(a.currentNote || a.notes[0]);
  await wait(200);
  a.noteMinimapToggle.checked = false;
  a.noteMinimapToggle.dispatchEvent(new Event('change'));
  await wait(200);
  r.hiddenWhenOff = !shown() && getComputedStyle(a.viewerText).marginRight === '0px';
  return r;
}

export const expected = {
  offAtFirst: true,
  hiddenWhileOff: true,
  saved: true,
  shownInViewer: true,
  copiesTheNote: 30,
  textKeepsClear: '116px',
  clickScrolls: true,
  boxFollows: true,
  shownInEditor: true,
  redraws: 31,
  hiddenElsewhere: true,
  hiddenWhenOff: true,
};
