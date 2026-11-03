// The note history keeps each earlier version (the note before an edit): it can be viewed in the
// note itself under a banner and restored from there, a restore keeps the current text as a version, only the latest versions keep their
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

  // The dialog: the current version, then the earlier ones, the newest first, then the creation
  a.openNoteHistory();
  r.rows = [...a.historyBody.querySelectorAll('.history-row')].map((row) =>
    row.className.replace('history-row is-', '')
  );
  r.snippet = a.historyBody.querySelector('.history-row.is-version .history-snippet').textContent;

  // View: the note shows that version under a banner, its own actions hidden; Current goes back
  a.historyBody.querySelectorAll('.history-view')[1].click();
  r.preview = {
    dialogClosed: a.noteHistoryModal.classList.contains('hidden'),
    text: a.viewerText.textContent.trim(),
    banner: !a.versionBanner.classList.contains('hidden'),
    actionsHidden: getComputedStyle(document.querySelector('.viewer-actions')).visibility,
    noteUnchanged: n.content,
  };
  a.versionCloseBtn.click();
  r.backToCurrent = [a.viewerText.textContent.trim(), a.versionBanner.classList.contains('hidden')];

  // Escape also leaves a preview; Restore puts the version back
  a.openNoteHistory();
  a.historyBody.querySelectorAll('.history-view')[1].click();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  r.escapeLeaves = a.versionBanner.classList.contains('hidden');
  a.openNoteHistory();
  a.historyBody.querySelectorAll('.history-view')[1].click();
  a.versionRestoreBtn.click();
  r.restored = {
    content: n.content,
    viewer: a.viewerText.textContent.trim(),
    banner: a.versionBanner.classList.contains('hidden'),
  };
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
  rows: ['current', 'version', 'version', 'created'],
  snippet: 'Plan',
  preview: {
    dialogClosed: true,
    text: 'one',
    banner: true,
    actionsHidden: 'hidden',
    noteUnchanged: '<p>three</p>',
  },
  backToCurrent: ['three', true],
  escapeLeaves: true,
  restored: { content: '<p>one</p>', viewer: 'one', banner: true },
  keptCurrent: '<p>three</p>',
  withText: 30,
  lockedStored: false,
};
