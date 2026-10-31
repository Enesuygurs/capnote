// A new note clears the search (or it would not show in the list); an empty list says there are
// no notes yet (with a way to write the first) or that none match; "On this day" lists the notes
// of this day a month and years ago; focus mode hides everything but the note and Escape leaves it
export async function run() {
  const a = window.app;
  const r = {};

  a.showWelcome();
  const empty = a.notesList.querySelector('.notes-list-empty');
  r.empty = {
    text: empty?.querySelector('p')?.textContent,
    button: !!empty?.querySelector('button'),
  };

  // A fixed "now": 4 November 2026
  a.dashboardToday = '2026-11-04T12:00:00';
  const mk = (title, iso) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = '<p>text</p>';
    a.saveNote();
    a.currentNote.createdAt = iso;
  };
  mk('Month', '2026-10-04T09:00:00');
  mk('Year', '2025-11-04T09:00:00');
  mk('Two years', '2024-11-04T09:00:00');
  mk('Other day', '2025-11-05T09:00:00');
  r.onThisDay = a.onThisDay().map((d) => [d.label, d.notes.map((n) => n.title)]);
  a.showWelcome();
  r.card = a.onThisDayList.querySelectorAll('.calendar-note').length;
  // 31 March: no 31 February a month back
  a.dashboardToday = '2026-03-31T12:00:00';
  r.noMonthDay = a.onThisDay().some((d) => d.label === '1 ay önce');
  a.dashboardToday = null;

  // A search that matches nothing, then a new note
  a.searchInput.value = 'zzz';
  a.searchNotes();
  r.noMatch = a.notesList.querySelector('.notes-list-empty')?.textContent.trim();
  a.createNewNote();
  r.searchCleared = a.searchInput.value;
  r.newListed = !!a.notesList.querySelector(`.note-item[data-note-id="${a.currentNote.id}"]`);

  // Focus mode
  a.focusModeBtn.click();
  r.focusOn = document.body.classList.contains('focus-mode');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  r.escLeaves = [document.body.classList.contains('focus-mode'), a.isEditorOpen()];
  a.focusModeBtn.click();
  a.cancelEdit();
  r.leftWithEditor = document.body.classList.contains('focus-mode');
  return r;
}

export const expected = {
  empty: { text: 'Henüz not yok', button: true },
  onThisDay: [
    ['1 ay önce', ['Month']],
    ['1 yıl önce', ['Year']],
    ['2 yıl önce', ['Two years']],
  ],
  card: 3,
  noMonthDay: false,
  noMatch: 'Eşleşen not yok',
  searchCleared: '',
  newListed: true,
  focusOn: true,
  escLeaves: [false, true],
  leftWithEditor: false,
};
