// Reminder timing: monthly keeps its day, completing a recurring reminder only skips one time,
// a passed reminder leaves the upcoming list as soon as it fires, broken times are dropped

export async function run() {
  const a = window.app;
  const local = (y, m, d) => new Date(y, m, d, 9, 0, 0).toISOString();
  const day = (iso) => new Date(iso).getDate();

  // Monthly from Jan 31: Feb 28, then Mar 31
  const feb = a._computeNextRecurrence(local(2027, 0, 31), 'monthly', 31);
  const mar = a._computeNextRecurrence(feb.toISOString(), 'monthly', 31);

  // Completing a daily reminder moves it to the next day instead of ending it
  const daily = {
    id: 'd1',
    noteId: null,
    noteTitle: 'Daily',
    datetime: local(2099, 4, 10),
    recurrence: 'daily',
    dismissed: false,
  };
  const once = { ...daily, id: 'o1', recurrence: 'none' };
  const broken = { ...daily, id: 'b1', datetime: 'not a date' };
  a.reminders = [daily, once, broken];
  await a.dismissReminder('d1');
  await a.dismissReminder('o1');

  // A reminder that just passed fires and leaves the upcoming list
  const soon = {
    id: 's1',
    noteId: null,
    noteTitle: 'Soon',
    datetime: new Date(Date.now() + 300).toISOString(),
    recurrence: 'none',
    dismissed: false,
  };
  a.reminders.push(soon);
  a.showNotificationsScreen();
  const listedBefore = !!a.remindersList.querySelector('[data-reminder-id="s1"]');
  await new Promise((r) => setTimeout(r, 900));
  const listedAfter = !!a.remindersList.querySelector('[data-reminder-id="s1"]');

  return {
    feb: day(feb),
    mar: day(mar),
    dailyNext: day(daily.datetime),
    dailyActive: !daily.dismissed,
    onceDone: once.dismissed,
    brokenDropped: broken.dismissed,
    listedBefore,
    listedAfter,
    fired: soon.dismissed,
  };
}

export const expected = {
  feb: 28,
  mar: 31,
  dailyNext: 11,
  dailyActive: true,
  onceDone: true,
  brokenDropped: true,
  listedBefore: true,
  listedAfter: false,
  fired: true,
};
