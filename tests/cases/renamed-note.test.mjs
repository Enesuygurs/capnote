// Reminders and notifications show the current title of a renamed note

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Before';
  a.richEditor.innerHTML = '<p>one two three</p>';
  a.saveNote(true);
  const n = a.currentNote;
  const future = new Date(Date.now() + 86400000);
  const local = new Date(future.getTime() - future.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  a.reminderDatetime.value = local;
  await a.addReminder();
  a.addNotification(n.id, 'Before', 'msg');
  await a.editCurrentNote();
  a.noteTitle.value = 'After';
  a.saveNote(true);
  a.showRemindersScreen();
  const reminderTitle = a.remindersList.querySelector('.reminder-note-title').textContent;
  a.showNotificationsScreen();
  const notifTitle = a.notificationsList.querySelector('.notification-note-title').textContent;
  return {
    reminderTitle,
    notifTitle,
    storedDatetime: a.reminders[0].datetime,
    isIso: /Z$/.test(a.reminders[0].datetime),
  };
}

export const expected = {
  reminderTitle: 'After',
  notifTitle: 'After',
  storedDatetime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/,
  isIso: true,
};
