// The note history keeps each earlier version (the note before an edit): it can be viewed and
// restored, a restore keeps the current text as a version, only the latest versions keep their
// text, and a locked note's versions never reach the disk
export async function run() {
  const a = window.app;
  const r = {};
  const hourAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
  a.createNewNote();
  a.noteTitle.value = 'Plan';
  a.richEditor.innerHTML = '<p>one</p>';
  a.saveNote();
  const n = a.currentNote;
  for (const [text, h] of [
    ['<p>two</p>', 3],
    ['<p>three</p>', 1],
  ]) {
    await a.editCurrentNote();
    a.richEditor.innerHTML = text;
    a.saveNote();
    n.history[n.history.length - 1].ts = hourAgo(h);
  }
  r.versions = n.history.filter((h) => h.version).map((h) => h.version.content);

  // The dialog: the current version, then the earlier ones, the newest first
  a.openNoteHistory();
  r.rows = [...a.historyBody.querySelectorAll('.history-item')].length;
  r.current = !!a.historyBody.querySelector('.history-entry.current');
  a.historyBody.querySelectorAll('.history-view')[1].click();
  r.shown = a.historyBody.querySelector('.history-version-body').textContent;
  r.restoreShown = !a.historyRestoreBtn.classList.contains('hidden');
  a.historyRestoreBtn.click();
  r.restored = { content: n.content, viewer: a.viewerText.textContent.trim() };
  r.keptCurrent = n.history[n.history.length - 1].version.content;

  // Only the latest 30 versions keep their text
  for (let i = 0; i < 40; i++) a.recordHistory(n, { merge: false });
  r.withText = n.history.filter((h) => h.version).length;

  // Locked: no versions on disk
  n.isLocked = true;
  r.lockedStored = a
    .serializeNotes()
    .find((x) => x.id === n.id)
    .history.some((h) => h.version);
  n.isLocked = false;
  return r;
}

export const expected = {
  versions: ['<p>one</p>', '<p>two</p>'],
  rows: 2,
  current: true,
  shown: 'one',
  restoreShown: true,
  restored: { content: '<p>one</p>', viewer: 'one' },
  keptCurrent: '<p>three</p>',
  withText: 30,
  lockedStored: false,
};
