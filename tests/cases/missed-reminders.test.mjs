// Reminders that passed while the app was closed become missed notifications and repeat from now

export async function seed() {
  const day = 86400000,
    now = Date.now();
  await window.electronAPI.storage.save('notes', [
    {
      id: 1,
      title: 'N',
      content: '<p>x</p>',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    },
  ]);
  await window.electronAPI.storage.save('reminders', [
    {
      id: 10,
      noteId: 1,
      noteTitle: 'N',
      datetime: new Date(now - 3 * day).toISOString(),
      recurrence: 'none',
      dismissed: false,
      recurrenceDays: [],
    },
    {
      id: 11,
      noteId: 1,
      noteTitle: 'N',
      datetime: new Date(now - 5 * day - 3600000).toISOString(),
      recurrence: 'daily',
      dismissed: false,
      recurrenceDays: [],
    },
    {
      id: 12,
      noteId: 1,
      noteTitle: 'N',
      datetime: new Date(now + day).toISOString(),
      recurrence: 'none',
      dismissed: false,
      recurrenceDays: [],
    },
  ]);
  await window.electronAPI.storage.save('notifications', []);
  return 'seeded';
}

export async function run() {
  const a = window.app;
  return {
    reminders: a.reminders.map((r) => ({
      id: r.id,
      dismissed: r.dismissed,
      future: new Date(r.datetime) > new Date(),
      hoursAhead: Math.round((new Date(r.datetime) - Date.now()) / 3600000),
    })),
    notifications: a.notifications.map((n) => n.kind),
  };
}

export const expected = {
  reminders: [
    {
      id: '10',
      dismissed: true,
      future: false,
      hoursAhead: -72,
    },
    {
      id: '11',
      dismissed: false,
      future: true,
      hoursAhead: 23,
    },
    {
      id: '12',
      dismissed: false,
      future: true,
      hoursAhead: 24,
    },
  ],
  notifications: ['reminderMissed', 'reminderMissed'],
};
