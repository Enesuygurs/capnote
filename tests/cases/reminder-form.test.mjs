// The reminder form: a quick choice fills the date and time, the repeat segments and weekday
// toggles fill what the reminder is saved with, and the form is empty again afterwards
export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Plan';
  await a.saveNote(true);
  await a.editCurrentNote();
  const r = {};
  const preset = (name) => a.reminderPresets.querySelector(`[data-preset="${name}"]`);

  // A fixed "now": Monday 2 March 2026, 12:00 (this evening is still ahead)
  a.dashboardToday = '2026-03-02T12:00:00';
  a.refreshReminderPresets();
  r.eveningAtNoon = !preset('evening').hidden;
  preset('tomorrow').click();
  r.tomorrow = [a.reminderDateInput.value, a.reminderTimeInput.value, a.reminderDatetime.value];
  r.tomorrowMarked = preset('tomorrow').classList.contains('active');
  preset('nextWeek').click();
  r.nextWeek = a.reminderDatetime.value;
  // Typing a time drops the mark; a date without a time means 09:00
  a.reminderTimeInput.value = '';
  a.reminderTimeInput.dispatchEvent(new Event('input'));
  r.noTime = a.reminderDatetime.value;
  r.markDropped = !a.reminderPresets.querySelector('.reminder-preset.active');
  a.dashboardToday = '2026-03-02T20:30:00';
  a.refreshReminderPresets();
  r.eveningAtNight = !preset('evening').hidden;
  a.dashboardToday = null;

  // A real reminder: tomorrow, weekly on Monday and Friday
  a.refreshReminderPresets();
  preset('tomorrow').click();
  a.reminderRepeat.querySelector('[data-value="weekly"]').click();
  r.recurrence = a.reminderRecurrence.value;
  r.weekdaysShown = !document.getElementById('reminderWeekdays').classList.contains('hidden');
  document.querySelectorAll('#reminderWeekdays .weekday-checkbox').forEach((box) => {
    if (box.value === '1' || box.value === '5') box.click();
  });
  await a.addReminder();
  const saved = a.reminders[a.reminders.length - 1];
  r.saved = { recurrence: saved.recurrence, days: saved.recurrenceDays };
  r.cards = a.noteRemindersList.querySelectorAll('.note-reminder-item').length;
  r.reset = {
    datetime: a.reminderDatetime.value,
    recurrence: a.reminderRecurrence.value,
    weekdaysHidden: document.getElementById('reminderWeekdays').classList.contains('hidden'),
    checked: document.querySelectorAll('#reminderWeekdays .weekday-checkbox:checked').length,
    active: a.reminderRepeat.querySelector('.segment.active').dataset.value,
  };
  a.cancelEdit();
  return r;
}

export const expected = {
  eveningAtNoon: true,
  tomorrow: ['2026-03-03', '09:00', '2026-03-03T09:00'],
  tomorrowMarked: true,
  nextWeek: '2026-03-09T09:00',
  noTime: '2026-03-09T09:00',
  markDropped: true,
  eveningAtNight: false,
  recurrence: 'weekly',
  weekdaysShown: true,
  saved: { recurrence: 'weekly', days: [1, 5] },
  cards: 1,
  reset: { datetime: '', recurrence: 'none', weekdaysHidden: true, checked: 0, active: 'none' },
};
