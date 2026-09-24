// The reminder form: the date button opens a calendar (choosing a day closes it; days before today
// cannot be chosen), the time button opens hour and minute columns; together they fill the
// reminder's time. The repeat segments and weekday toggles fill what the reminder is saved with,
// and the form is empty again afterwards.
export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Plan';
  a.saveNote(true);
  const r = {};
  const datePicker = a.reminderPicker;
  const timePicker = a.reminderTimePicker;
  const open = (picker) => !picker.classList.contains('hidden');
  const day = (key) => datePicker.querySelector(`.date-picker-day[data-day="${key}"]`);
  const time = (unit, value) =>
    timePicker.querySelector(`.time-column[data-unit="${unit}"] [data-value="${value}"]`);

  // A fixed "now": Monday 2 March 2026, 12:00
  a.dashboardToday = '2026-03-02T12:00:00';

  // A time before a day: it goes on the next time it comes (10:00 has passed today)
  a.reminderTimeBtn.click();
  r.timeOpen = open(timePicker) && !open(datePicker);
  time('hour', 10).click();
  r.timeFirst = a.reminderDatetime.value;
  r.timeStaysOpen = open(timePicker);
  timePicker.querySelector('[data-action="done"]').click();
  r.timeClosed = !open(timePicker);

  // The day: past days are disabled, choosing one closes the calendar
  a.reminderDateBtn.click();
  r.dateOpen = open(datePicker) && !open(timePicker);
  r.yesterdayDisabled = day('2026-03-01').disabled;
  r.todayMarked = day('2026-03-02').classList.contains('is-today');
  day('2026-03-05').click();
  r.dateClosed = !open(datePicker);
  r.afterDay = a.reminderDatetime.value;

  // Changing the time keeps the day
  a.reminderTimeBtn.click();
  time('hour', 18).click();
  time('minute', 45).click();
  r.chosen = a.reminderDatetime.value;
  r.buttons = [
    a.reminderDateBtn.classList.contains('has-value'),
    a.reminderTimeBtn.querySelector('.reminder-when-text').textContent,
  ];
  // Opening the other picker closes this one; a click elsewhere closes it
  a.reminderDateBtn.click();
  r.oneAtATime = open(datePicker) && !open(timePicker);
  datePicker.querySelector('[data-month="1"]').click();
  r.nextMonthFirst = datePicker.querySelector('.date-picker-day:not(.is-other-month)').dataset.day;
  document.body.click();
  r.outsideCloses = !open(datePicker);

  // A day alone rings at 09:00
  a.resetReminderForm();
  a.reminderDateBtn.click();
  day('2026-03-06').click();
  r.dayAlone = a.reminderDatetime.value;
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
    buttons: [
      a.reminderDateBtn.classList.contains('has-value'),
      a.reminderTimeBtn.classList.contains('has-value'),
    ],
    recurrence: a.reminderRecurrence.value,
    weekdaysHidden: document.getElementById('reminderWeekdays').classList.contains('hidden'),
    checked: document.querySelectorAll('#reminderWeekdays .weekday-checkbox:checked').length,
  };
  a.cancelEdit();
  return r;
}

export const expected = {
  timeOpen: true,
  timeFirst: '2026-03-03T10:00',
  timeStaysOpen: true,
  timeClosed: true,
  dateOpen: true,
  yesterdayDisabled: true,
  todayMarked: true,
  dateClosed: true,
  afterDay: '2026-03-05T10:00',
  chosen: '2026-03-05T18:45',
  buttons: [true, '18:45'],
  oneAtATime: true,
  nextMonthFirst: '2026-04-01',
  outsideCloses: true,
  dayAlone: '2026-03-06T09:00',
  recurrence: 'weekly',
  weekdaysShown: true,
  saved: { recurrence: 'weekly', days: [1, 5] },
  cards: 1,
  reset: {
    datetime: '',
    buttons: [false, false],
    recurrence: 'none',
    weekdaysHidden: true,
    checked: 0,
  },
};
