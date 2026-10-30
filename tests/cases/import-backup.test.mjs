// Importing notes and folders from a backup, replacing or merging

export async function run() {
  const a = window.app;
  const backup = {
    notes: [
      {
        id: 1,
        title: 'A',
        content: '<p>a</p>',
        createdAt: '2026-01-01T00:00:00.000Z',
        folderId: 77,
      },
      {
        id: 2,
        title: 'B',
        content: '<p>b</p>',
        createdAt: '2026-01-02T00:00:00.000Z',
        folderId: null,
      },
    ],
    folders: [{ id: 77, name: 'F', color: '#000' }],
    settings: { darkMode: 'true' },
  };
  const runImport = async (opts) => {
    a.showImportOptionsDialog = async () => opts;
    // The text of the picked backup file goes through the same import as the Import button
    await a.importBackupText(JSON.stringify(backup));
    await new Promise((r) => setTimeout(r, 100));
  };
  await runImport({
    merge: true,
    notes: true,
    folders: false,
    reminders: false,
    notifications: false,
    settings: false,
  });
  const r1 = {
    notes: a.notes.map((n) => [n.title, n.folderId]),
    folders: a.folders.length,
    dark: a.settings.darkMode,
  };
  await runImport({
    merge: true,
    notes: true,
    folders: true,
    reminders: false,
    notifications: false,
    settings: false,
  });
  return { r1, r2: { notes: a.notes.length, folders: a.folders.length } };
}

export const expected = {
  r1: {
    notes: [
      ['A', null],
      ['B', null],
    ],
    folders: 0,
    dark: false,
  },
  r2: {
    notes: 2,
    folders: 1,
  },
};
