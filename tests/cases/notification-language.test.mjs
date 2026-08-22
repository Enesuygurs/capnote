// Notifications are worded in the current language; older stored texts stay as they were

export async function run() {
  const a = window.app;
  a.notifications = [
    {
      id: 'old',
      noteId: null,
      noteTitle: 'Legacy',
      message: 'Eski metin',
      time: new Date().toISOString(),
      read: false,
    },
  ];
  a.createNewNote();
  a.noteTitle.value = 'Dentist';
  a.richEditor.innerHTML = '<p>x</p>';
  a.saveNote(true);
  const at = new Date(Date.now() - 30000).toISOString();
  a.reminders.push({
    id: 'r1',
    noteId: a.currentNote.id,
    noteTitle: 'Dentist',
    datetime: at,
    dismissed: false,
  });
  a.checkDueReminders();
  a.testNativeNotification();
  const read = () =>
    [...a.notificationsList.querySelectorAll('.notification-card')].map(
      (c) =>
        c.querySelector('.notification-note-title').textContent.trim() +
        ' | ' +
        c.querySelector('.notification-message').textContent.trim()
    );
  const tr = read();
  a.languageSelect.value = 'en';
  a.languageSelect.dispatchEvent(new Event('change'));
  await new Promise((r) => setTimeout(r, 200));
  const stored = (await window.electronAPI.storage.load()).data.notifications.map((n) => [
    n.kind || null,
    n.message || null,
  ]);
  return { tr, en: read(), stored };
}

export const expected = {
  tr: [
    'Test bildirimi | Bu bir test bildirimidir.',
    /^Dentist \| Hatırlatma zamanı geldi: \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}$/,
    'Legacy | Eski metin',
  ],
  en: [
    'Test notification | This is a test notification.',
    /^Dentist \| Reminder time: \d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} [AP]M$/,
    'Legacy | Eski metin',
  ],
  stored: [
    ['test', null],
    ['reminderDue', null],
    [null, 'Eski metin'],
  ],
};
