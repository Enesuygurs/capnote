// Numeric and fractional ids from older versions become strings and folder links still work

export async function seed() {
  const t = new Date().toISOString();
  await window.electronAPI.storage.save('notes', [
    {
      id: 1700000000001,
      title: 'In folder',
      content: '<p>a</p>',
      createdAt: t,
      updatedAt: t,
      folderId: 1700000000123.456,
      tags: [],
    },
    {
      id: 1700000000002,
      title: 'Root default',
      content: '<p>b</p>',
      createdAt: t,
      updatedAt: t,
      folderId: 'default',
      tags: [],
    },
  ]);
  await window.electronAPI.storage.save('folders', [
    { id: 1700000000123.456, name: 'Float folder', color: '#123456', expanded: true },
  ]);
  await window.electronAPI.storage.save('reminders', [
    {
      id: 5,
      noteId: 1700000000001,
      noteTitle: 'In folder',
      datetime: '2031-01-01T10:00:00.000Z',
      recurrence: 'none',
      dismissed: false,
    },
  ]);
  await window.electronAPI.storage.save('notifications', [
    { id: 6, noteId: 1700000000002, noteTitle: 'Root default', message: 'm', time: t, read: false },
  ]);
  await window.electronAPI.storage.save('todos', [
    { id: 7, name: 'S', todos: [{ id: 8, text: 'x', completed: false }] },
  ]);
  await window.electronAPI.storage.save('settings', { lastViewedNoteId: '1700000000001' });
  return 'seeded';
}

export async function run() {
  const a = window.app;
  const folder = a.folders[0];
  const inFolder = a.notes.find((n) => n.title === 'In folder');
  const root = a.notes.find((n) => n.title === 'Root default');
  // reminders/notifications still resolve their notes
  document.querySelector('#notificationsNav').click();
  const viewBtn = a.remindersList.querySelector('.view-note-btn');
  viewBtn.click();
  const openedFromReminder = a.currentNote && a.currentNote.title;
  // move the root note into the folder through the same path as drag & drop
  await a.moveNoteToFolder(root.id, folder.id);
  const folderList = [
    ...document.querySelectorAll(
      `.folder-notes-container[data-folder-id="${folder.id}"] .note-item-title`
    ),
  ].map((e) => e.textContent);
  await a.moveNoteToFolder(root.id, null);
  a.createNewNote();
  a.noteTitle.value = 'New';
  a.richEditor.innerHTML = '<p>n</p>';
  a.saveNote(true);
  return {
    types: [
      typeof inFolder.id,
      typeof folder.id,
      typeof a.reminders[0].id,
      typeof a.reminders[0].noteId,
      typeof a.todoSections[0].todos[0].id,
    ],
    inFolderLinked: inFolder.folderId === folder.id,
    rootFolderId: root.folderId,
    lastViewedOpened: a.notes.some((n) => n.id === '1700000000001'),
    openedFromReminder,
    folderList,
    rootBackToNull: root.folderId,
    newIdIsUuid: /^[0-9a-f-]{36}$/.test(a.currentNote.id),
  };
}

export const expected = {
  types: ['string', 'string', 'string', 'string', 'string'],
  inFolderLinked: true,
  rootFolderId: null,
  lastViewedOpened: true,
  openedFromReminder: 'In folder',
  folderList: ['In folder', 'Root default'],
  rootBackToNull: null,
  newIdIsUuid: true,
};
