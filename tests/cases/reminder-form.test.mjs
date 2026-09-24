// The reminder form: the date button opens a calendar (choosing a day closes it; days before today
// cannot be chosen), the time button opens hour and minute grids (times that have passed today
// cannot be chosen). Nothing is filled in by itself: without a day, an hour and a minute, setting
// the reminder warns and points at what is missing. The repeat segments and weekday toggles fill
// what the reminder is saved with, and the form is empty again afterwards.
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
    timePicker.querySelector(`.time-grid[data-unit="${unit}"] [data-value="${value}"]`);
  const display = () =>
    [...timePicker.querySelectorAll('.time-display-part')].map((p) => p.textContent).join(':');
  const toast = () => a.notification?.textContent.trim();
  const count = a.reminders.length;

  // A fixed "now": Monday 2 March 2026, 12:00
  a.dashboardToday = '2026-03-02T12:00:00';

  // Nothing chosen: a warning, both buttons pointed at, no reminder
  await a.addReminder();
  r.nothing = {
    toast: toast(),
    flagged: [
      a.reminderDateBtn.classList.contains('is-missing'),
      a.reminderTimeBtn.classList.contains('is-missing'),
    ],
    added: a.reminders.length - count,
  };

  // A day alone: no time is filled in
  a.reminderDateBtn.click();
  r.dateOpen = open(datePicker) && !open(timePicker);
  r.yesterdayDisabled = day('2026-03-01').disabled;
  r.todayMarked = day('2026-03-02').classList.contains('is-today');
  day('2026-03-05').click();
  r.dateClosed = !open(datePicker);
  r.dayAlone = {
    value: a.reminderDatetime.value,
    timeButton: a.reminderTimeBtn.classList.contains('has-value'),
  };
  await a.addReminder();
  r.noTime = { toast: toast(), added: a.reminders.length - count };

  // The time: the hour alone is not enough, the minute completes it
  a.reminderTimeBtn.click();
  r.timeOpen = open(timePicker) && !open(datePicker);
  r.emptyDisplay = display();
  time('hour', 18).click();
  r.hourAlone = { display: display(), value: a.reminderDatetime.value };
  time('minute', 45).click();
  r.chosen = { display: display(), value: a.reminderDatetime.value };
  r.buttons = [
    a.reminderDateBtn.classList.contains('has-value'),
    a.reminderTimeBtn.querySelector('.reminder-when-text').textContent,
  ];
  // Clear empties the time; Done closes
  timePicker.querySelector('[data-action="clear"]').click();
  r.cleared = { display: display(), value: a.reminderDatetime.value };
  timePicker.querySelector('[data-action="done"]').click();
  r.timeClosed = !open(timePicker);

  // On today the hours and minutes that have passed are disabled
  a.reminderDateBtn.click();
  day('2026-03-02').click();
  a.reminderTimeBtn.click();
  r.todayPast = {
    hour11: time('hour', 11).disabled,
    hour12: time('hour', 12).disabled,
  };
  time('hour', 12).click();
  r.todayPast.minute0 = time('minute', 0).disabled;
  r.todayPast.minute5 = time('minute', 5).disabled;

  // One picker at a time; a click elsewhere closes it
  a.reminderDateBtn.click();
  r.oneAtATime = open(datePicker) && !open(timePicker);
  datePicker.querySelector('[data-month="1"]').click();
  r.nextMonthFirst = datePicker.querySelector('.date-picker-day:not(.is-other-month)').dataset.day;
  document.body.click();
  r.outsideCloses = !open(datePicker);
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
  nothing: { toast: 'Lütfen bir tarih ve saat seçin', flagged: [true, true], added: 0 },
  dateOpen: true,
  yesterdayDisabled: true,
  todayMarked: true,
  dateClosed: true,
  dayAlone: { value: '', timeButton: false },
  noTime: { toast: 'Lütfen bir saat seçin', added: 0 },
  timeOpen: true,
  emptyDisplay: '--:--',
  hourAlone: { display: '18:--', value: '' },
  chosen: { display: '18:45', value: '2026-03-05T18:45' },
  buttons: [true, '18:45'],
  cleared: { display: '--:--', value: '' },
  timeClosed: true,
  todayPast: { hour11: true, hour12: false, minute0: true, minute5: false },
  oneAtATime: true,
  nextMonthFirst: '2026-04-01',
  outsideCloses: true,
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
