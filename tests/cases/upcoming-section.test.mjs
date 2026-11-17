// The reminders page: "Upcoming" shows only with reminders to come, "Came due" only with ones
// that came; with neither, one message for the page

export async function run() {
  const a = window.app;
  const hidden = (id) => document.getElementById(id).classList.contains('hidden');
  a.reminders = [];
  a.notifications = [];
  a.showRemindersScreen();
  const empty = {
    upcomingHidden: hidden('upcomingSection'),
    cameHidden: hidden('notificationsSection'),
    message: !hidden('remindersEmpty'),
  };
  const visible = !a.remindersScreen.classList.contains('hidden');
  const navActive = a.remindersNav.classList.contains('active');

  // Only one that came due: its section, no page message, no empty "Upcoming"
  a.notifications = [
    { id: 'n1', title: 'Test', message: 'x', timestamp: new Date().toISOString(), read: false },
  ];
  a.showRemindersScreen();
  const onlyCame = {
    upcomingHidden: hidden('upcomingSection'),
    cameShown: !hidden('notificationsSection'),
    messageHidden: hidden('remindersEmpty'),
  };

  a.reminders = [
    { id: 'r1', noteId: null, noteTitle: 'Soon', datetime: '2099-01-01T09:00:00.000Z' },
  ];
  a.showRemindersScreen();
  const listed = a.remindersList.querySelectorAll('.reminder-card').length;
  const upcomingShown = !hidden('upcomingSection');
  return { empty, visible, navActive, onlyCame, listed, upcomingShown };
}

export const expected = {
  empty: { upcomingHidden: true, cameHidden: true, message: true },
  visible: true,
  navActive: true,
  onlyCame: { upcomingHidden: true, cameShown: true, messageHidden: true },
  listed: 1,
  upcomingShown: true,
};
