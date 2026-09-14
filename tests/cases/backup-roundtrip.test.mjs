// A full backup exports everything, merges on import and refuses backups from a newer version

export const allowedErrors = [/newer version|daha yeni/];

export async function run() {
  const a = window.app;
  a.todoSectionInput.value = 'Errands';
  a.addTodoSection();
  a.addTodoToSection(a.todoSections[0].id, 'Buy milk');
  // What the backup file holds (the exports test checks that the file is written)
  const exported = JSON.parse(JSON.stringify(await a.buildBackupData()));
  const runImport = async (payload, opts) => {
    a.showImportOptionsDialog = async () => opts;
    // The text of the picked backup file goes through the same import as the Import button
    await a.importBackupText(JSON.stringify(payload));
    await new Promise((r) => setTimeout(r, 100));
  };
  await runImport(exported, {
    merge: true,
    notes: true,
    folders: true,
    reminders: true,
    notifications: true,
    todos: true,
    settings: true,
  });
  const afterMerge = a.todoSections.map((s) => s.name + ':' + s.todos.map((t) => t.text));
  await runImport({ ...exported, version: 99 }, { merge: true, todos: true });
  const tooNewToast = a.notificationText.textContent;
  return {
    version: exported.version,
    exportedTodos: exported.todos.length,
    settingsKeys: Object.keys(exported.settings).length,
    afterMerge,
    tooNewToast,
  };
}

export const expected = {
  version: 2,
  exportedTodos: 1,
  settingsKeys: 12,
  afterMerge: ['Errands:Buy milk'],
  tooNewToast:
    "Veriler içe aktarılırken hata oluştu: Bu yedek Capnote'un daha yeni bir sürümüyle alınmış. İçe aktarmak için uygulamayı güncelleyin.",
};
