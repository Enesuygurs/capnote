// The notifications screen shows the upcoming reminders section only while a reminder is coming up

export async function run() {
  const a = window.app;
  const section = () => a.remindersList.closest('.page-section');
  a.reminders = [];
  a.showNotificationsScreen();
  const withoutReminders = section().classList.contains('hidden');

  a.reminders = [
    { id: 'r1', noteId: null, noteTitle: 'Soon', datetime: '2099-01-01T09:00:00.000Z' },
  ];
  a.showNotificationsScreen();
  const withReminder = section().classList.contains('hidden');
  return { withoutReminders, withReminder };
}

export const expected = {
  withoutReminders: true,
  withReminder: false,
};
