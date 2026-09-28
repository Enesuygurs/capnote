// The automatic daily backups: Settings > Data lists them, a restore puts the day's data back
// (settings stay) and keeps the current data as "before the last restore", which can be restored
// in turn to undo it
export async function seed() {
  const a = window.app;
  // The day's backup is taken before this first write, so it holds the empty start
  a.createNewNote();
  a.noteTitle.value = 'Written today';
  a.saveNote();
  a.setSetting('noteSort', 'title');
  await new Promise((r) => setTimeout(r, 300));
}

export async function run() {
  const a = window.app;
  const stored = async () => (await window.electronAPI.storage.load()).data;
  const r = {};
  const today = new Date().toISOString().slice(0, 10);

  r.listed = (await window.electronAPI.backups.list()).map((b) => [b.id === today, b.notes]);

  // Settings > Data shows the backups
  a.showSettingsModal();
  await new Promise((res) => setTimeout(res, 300));
  const rows = [...a.autoBackupsList.querySelectorAll('.auto-backup')];
  r.rows = rows.map((row) => row.querySelector('small').textContent.includes('0'));
  r.button = !!rows[0]?.querySelector('.auto-backup-restore');
  a.hideAllModals();

  // Restore the start of the day: the note written today is gone, the settings are not
  await window.electronAPI.backups.restore(today);
  let data = await stored();
  r.restored = { notes: (data.notes || []).length, sort: data.settings?.noteSort };
  const after = await window.electronAPI.backups.list();
  r.afterList = after.map((b) => [b.id, b.notes]).map(([id, n]) => [id === today ? 'day' : id, n]);

  // Undo: restore what was there before
  await window.electronAPI.backups.restore('before-restore');
  data = await stored();
  r.undone = (data.notes || []).map((n) => n.title);

  // An unknown backup is refused
  r.unknown = await window.electronAPI.backups.restore('../data').then(
    () => 'restored',
    () => 'refused'
  );

  // While restoring nothing in memory is written
  a.isRestoring = true;
  await a.persist('notes', []);
  a.isRestoring = false;
  r.guarded = (await stored()).notes.length;
  return r;
}

export const expected = {
  listed: [[true, 0]],
  rows: [true],
  button: true,
  restored: { notes: 0, sort: 'title' },
  afterList: [
    ['before-restore', 1],
    ['day', 0],
  ],
  undone: ['Written today'],
  unknown: 'refused',
  guarded: 1,
};
