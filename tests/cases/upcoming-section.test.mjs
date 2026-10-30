// The reminders page lists the reminders still to come, or says there are none

export async function run() {
  const a = window.app;
  a.reminders = [];
  a.showRemindersScreen();
  const empty = !!a.remindersList.querySelector('.empty-state');
  const visible = !a.remindersScreen.classList.contains('hidden');
  const navActive = a.remindersNav.classList.contains('active');

  a.reminders = [
    { id: 'r1', noteId: null, noteTitle: 'Soon', datetime: '2099-01-01T09:00:00.000Z' },
  ];
  a.showRemindersScreen();
  const listed = a.remindersList.querySelectorAll('.reminder-card').length;
  return { empty, visible, navActive, listed };
}

export const expected = {
  empty: true,
  visible: true,
  navActive: true,
  listed: 1,
};
