// Links between notes: "[[" suggests notes, picking one inserts a link, "[[Title]]" typed in full
// links too; in the viewer a link opens its note with the note's current title, the target lists
// the notes that link to it, and a link to a deleted note shows as broken

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ed = a.richEditor;
  const typeChars = (text) =>
    [...text].forEach((c) => document.execCommand('insertText', false, c));
  const key = (k) =>
    ed.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const make = (title) => {
    a.createNewNote();
    a.noteTitle.value = title;
    ed.innerHTML = '<p>x</p>';
    a.saveNote(true);
    return a.currentNote;
  };
  const plan = make('Project plan');
  const budget = make('Budget');
  make('Plants');

  // Suggestions while typing "[[pl"
  a.createNewNote();
  a.noteTitle.value = 'Diary';
  ed.innerHTML = '<p><br></p>';
  ed.focus();
  a.placeCaret(ed.querySelector('p'), 0);
  typeChars('See [[pl');
  const shown = [...a.noteLinkMenu.querySelectorAll('.menu-item span')].map((s) => s.textContent);
  const menuOpen = !a.noteLinkMenu.classList.contains('hidden');
  key('ArrowDown');
  key('Enter');
  const picked = ed.querySelector('a.note-link')?.dataset.noteId;
  const menuClosed = a.noteLinkMenu.classList.contains('hidden');
  // Typed in full
  typeChars('and [[Budget]]');
  const typedLink = [...ed.querySelectorAll('a.note-link')].map((l) => l.dataset.noteId);
  a.saveNote(true);
  const diary = a.currentNote;

  // Viewer: the link shows the current title and opens its note
  plan.title = 'Project plan v2';
  a.selectNote(diary);
  const linkTexts = [...a.viewerText.querySelectorAll('a.note-link')].map((l) => l.textContent);
  a.viewerText.querySelector(`a.note-link[data-note-id="${budget.id}"]`).click();
  await wait(50);
  const opened = a.currentNote.id === budget.id;
  const backlinks = [...a.viewerBacklinks.querySelectorAll('.backlink span')].map(
    (s) => s.textContent
  );
  const backlinksShown = !a.viewerBacklinks.classList.contains('hidden');

  // A deleted target: the link is shown as broken
  a.notes = a.notes.filter((n) => n.id !== budget.id);
  a.selectNote(diary);
  const broken = a.viewerText
    .querySelector(`a.note-link[data-note-id="${budget.id}"]`)
    .classList.contains('is-broken');

  return {
    shown,
    menuOpen,
    pickedWithArrow: picked === plan.id,
    menuClosed,
    typedLink: typedLink.length === 2 && typedLink[1] === budget.id,
    linkTexts,
    opened,
    backlinks,
    backlinksShown,
    broken,
  };
}

export const expected = {
  shown: ['Plants', 'Project plan'],
  menuOpen: true,
  pickedWithArrow: true,
  menuClosed: true,
  typedLink: true,
  linkTexts: ['Project plan v2', 'Budget'],
  opened: true,
  backlinks: ['Diary'],
  backlinksShown: true,
  broken: true,
};
