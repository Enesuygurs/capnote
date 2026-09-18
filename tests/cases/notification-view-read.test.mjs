// Viewing a notification's note marks the notification read; there is no separate read button
export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Alpha plan';
  a.saveNote(true);
  const r = {};
  a.notifications = [
    {
      id: 'n1',
      noteId: a.currentNote.id,
      type: 'reminderDue',
      time: new Date().toISOString(),
      read: false,
    },
  ];
  a.showNotificationsScreen();
  r.readButton = !!a.notificationsList.querySelector('.mark-read-btn');
  a.notificationsList.querySelector('.view-notification-note-btn').click();
  r.viewed = { read: a.notifications[0].read, open: a.currentNote.title, viewer: a.isViewerOpen() };
  return r;
}

export const expected = {
  readButton: false,
  viewed: { read: true, open: 'Alpha plan', viewer: true },
};
