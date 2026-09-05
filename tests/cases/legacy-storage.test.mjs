// Data an older version kept in localStorage moves to the data files

// The seed plays the older version: it leaves data in localStorage only
export const upgradeAfterSeed = true;

export async function seed() {
  // Simulates data written by older versions straight into localStorage
  const t = '2025-12-01T10:00:00.000Z';
  localStorage.setItem(
    'capnote-notes',
    JSON.stringify([
      {
        id: 1,
        title: 'Old note',
        content: '<p>old</p>',
        createdAt: t,
        updatedAt: t,
        folderId: 9.5,
        tags: ['x'],
      },
      {
        id: 2,
        title: 'Old secret',
        content: '<p>classified</p>',
        createdAt: t,
        updatedAt: t,
        folderId: 'default',
        isLocked: true,
        password: 'pw',
        tags: [],
      },
    ])
  );
  localStorage.setItem(
    'capnote-folders',
    JSON.stringify([{ id: 9.5, name: 'Old folder', color: '#00ff00' }])
  );
  localStorage.setItem(
    'capnote-reminders',
    JSON.stringify([
      { id: 3, noteId: 1, noteTitle: 'Old note', datetime: '2031-05-01T08:00', recurrence: 'none' },
    ])
  );
  localStorage.setItem(
    'capnote-notifications',
    JSON.stringify([{ id: 4, noteId: 1, noteTitle: 'Old note', message: 'm', time: t, read: true }])
  );
  localStorage.setItem(
    'capnote-todo-sections',
    JSON.stringify([
      { id: '5', name: 'Old todos', todos: [{ id: '6', text: 'keep me', completed: false }] },
    ])
  );
  localStorage.setItem('app-language', 'en');
  localStorage.setItem('darkMode', 'true');
  localStorage.setItem('maxPinnedNotes', '5');
  localStorage.setItem('settings.confirmDelete', 'false');
  localStorage.setItem('editorSidebarVisible', 'false');
  localStorage.setItem('last-viewed-note', '1');
  return 'seeded';
}

export async function run() {
  const a = window.app;
  const stored = (await window.electronAPI.storage.load()).data;
  return {
    settings: a.settings,
    uiLanguage: (await import(new URL('js/i18n.js', location.href).href)).i18n.getLanguage(),
    darkApplied: document.documentElement.getAttribute('data-theme'),
    openedNote: a.currentNote && a.currentNote.title,
    legacySettingKeysLeft: Object.keys(localStorage),
    appNotes: a.notes.map((n) => [n.title, n.folderId]),
    appFolders: a.folders.map((f) => f.name),
    appReminders: a.reminders.length,
    appTodos: a.todoSections.map((s) => s.todos.map((t) => t.text).join()),
    storedNotes: stored.notes.length,
    storedTodos: stored.todos.length,
    lockedEncrypted: !!stored.notes.find((n) => n.title === 'Old secret').encrypted,
    plaintextOnDisk: JSON.stringify(stored).includes('classified'),
    localStorageCleared: [
      'capnote-notes',
      'capnote-folders',
      'capnote-reminders',
      'capnote-notifications',
      'capnote-todo-sections',
    ].every((k) => localStorage.getItem(k) === null),
  };
}

export const expected = {
  settings: {
    language: 'en',
    darkMode: true,
    accentColor: null,
    syncFolderAccent: false,
    folderColorsBackup: null,
    autoSave: true,
    onNoteDelete: 'lastNote',
    startupPage: 'lastNote',
    nativeNotifications: true,
    editorSidebarVisible: false,
    closeToTray: true,
    lastViewedNoteId: '1',
  },
  uiLanguage: 'en',
  darkApplied: 'dark',
  openedNote: 'Old note',
  legacySettingKeysLeft: [],
  appNotes: [
    ['Old note', '9.5'],
    ['Old secret', null],
  ],
  appFolders: ['Old folder'],
  appReminders: 1,
  appTodos: ['keep me'],
  storedNotes: 2,
  storedTodos: 1,
  lockedEncrypted: true,
  plaintextOnDisk: false,
  localStorageCleared: true,
};
