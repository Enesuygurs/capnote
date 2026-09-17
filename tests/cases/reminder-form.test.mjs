// The reminder form: the picker's day, hour and minute fill the reminder's time, days before today
// cannot be picked, the repeat segments and weekday toggles fill what the reminder is saved with,
// and the form is empty again afterwards
export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Plan';
  a.saveNote(true);
  const r = {};
  const picker = a.reminderPicker;
  const day = (key) => picker.querySelector(`.date-picker-day[data-day="${key}"]`);
  const time = (unit, value) =>
    picker.querySelector(`.time-column[data-unit="${unit}"] [data-value="${value}"]`);

  // A fixed "now": Monday 2 March 2026, 12:00
  a.dashboardToday = '2026-03-02T12:00:00';
  a.reminderWhenBtn.click();
  r.open = a.isReminderPickerOpen();
  r.yesterdayDisabled = day('2026-03-01').disabled;
  r.todayMarked = day('2026-03-02').classList.contains('is-today');
  // A time before a day: it goes on the next time it comes (10:00 has passed today)
  time('hour', 10).click();
  r.timeFirst = a.reminderDatetime.value;
  day('2026-03-05').click();
  time('hour', 18).click();
  time('minute', 45).click();
  r.chosen = a.reminderDatetime.value;
  r.selected = picker.querySelector('.date-picker-day.is-selected').dataset.day;
  r.buttonShowsIt = a.reminderWhenBtn.classList.contains('has-value');
  // Next month
  picker.querySelector('[data-month="1"]').click();
  r.nextMonthFirst = picker.querySelector('.date-picker-day:not(.is-other-month)').dataset.day;
  picker.querySelector('[data-action="done"]').click();
  r.closed = !a.isReminderPickerOpen();
  // Clear empties it
  a.reminderWhenBtn.click();
  picker.querySelector('[data-action="clear"]').click();
  r.cleared = a.reminderDatetime.value;
  // A click elsewhere closes it
  a.reminderWhenBtn.click();
  document.body.click();
  r.outsideCloses = !a.isReminderPickerOpen();
  a.dashboardToday = null;

  // A real reminder: weekly on Monday and Friday, from tomorrow
  const tomorrow = new Date(Date.now() + 86400000);
  a.setReminderMoment(
    new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 9, 0)
  );
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
    button: a.reminderWhenBtn.classList.contains('has-value'),
    recurrence: a.reminderRecurrence.value,
    weekdaysHidden: document.getElementById('reminderWeekdays').classList.contains('hidden'),
    checked: document.querySelectorAll('#reminderWeekdays .weekday-checkbox:checked').length,
  };
  a.cancelEdit();
  return r;
}

export const expected = {
  open: true,
  yesterdayDisabled: true,
  todayMarked: true,
  timeFirst: '2026-03-03T10:00',
  chosen: '2026-03-05T18:45',
  selected: '2026-03-05',
  buttonShowsIt: true,
  nextMonthFirst: '2026-04-01',
  closed: true,
  cleared: '',
  outsideCloses: true,
  recurrence: 'weekly',
  weekdaysShown: true,
  saved: { recurrence: 'weekly', days: [1, 5] },
  cards: 1,
  reset: { datetime: '', button: false, recurrence: 'none', weekdaysHidden: true, checked: 0 },
};
