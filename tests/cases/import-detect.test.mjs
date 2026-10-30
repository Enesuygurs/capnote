// One export and one import: the export saves a backup when the .json type is picked, and the
// import recognises a picked .json file as a backup (Markdown files are covered by markdown-io)

export async function seed() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Kept in the backup';
  a.richEditor.innerHTML = '<p>x</p>';
  a.saveNote(true);
  await a.exportData();
  await new Promise((r) => setTimeout(r, 300));
  return 'seeded';
}

export async function run() {
  const a = window.app;
  a.notes = [];
  a.showImportOptionsDialog = async () => ({ merge: true, notes: true });
  await a.importData();
  return { titles: a.notes.map((n) => n.title) };
}

export const expected = { titles: ['Kept in the backup'] };

export function checkFiles(files) {
  return { saved: Object.keys(files).map((n) => n.replace(/\d{4}-\d{2}-\d{2}/, '<date>')) };
}

export const expectedFiles = { saved: ['capnote-<date>.json'] };
