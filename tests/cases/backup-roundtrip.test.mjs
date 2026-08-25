// A full backup exports everything, merges on import and refuses backups from a newer version

export const allowedErrors = [/newer version|daha yeni/];

export async function run() {
  const a = window.app;
  // capture what exportAllData downloads
  let exported = null;
  const origCreate = URL.createObjectURL;
  URL.createObjectURL = (blob) => {
    blob.text().then((t) => (exported = JSON.parse(t)));
    return 'blob:x';
  };
  a.todoSectionInput.value = 'Errands';
  a.addTodoSection();
  a.addTodoToSection(a.todoSections[0].id, 'Buy milk');
  a.exportAllData();
  await new Promise((r) => setTimeout(r, 200));
  URL.createObjectURL = origCreate;
  const runImport = async (payload, opts) => {
    a.showImportOptionsDialog = async () => opts;
    const orig = document.createElement.bind(document);
    document.createElement = (tag) => {
      const el = orig(tag);
      if (tag === 'input') {
        el.click = () => {
          Object.defineProperty(el, 'files', {
            value: [new File([JSON.stringify(payload)], 'b.json')],
          });
          el.dispatchEvent(new Event('change'));
        };
      }
      return el;
    };
    a.importAllData();
    document.createElement = orig;
    await new Promise((r) => setTimeout(r, 400));
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
