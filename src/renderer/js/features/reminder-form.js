// The reminder form in the editor's side panel: one button that opens a date and time picker (a
// month calendar with hour and minute columns), how often it repeats and on which days. It fills
// the hidden #reminderDatetime and #reminderRecurrence fields that addReminder reads.

import { i18n } from '../i18n.js';

const pad = (n) => String(n).padStart(2, '0');
const MINUTE_STEP = 5;

export class ReminderFormFeature {
  dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  // The chosen moment as a Date, or null
  reminderMoment() {
    const value = this.reminderDatetime.value;
    return value ? new Date(value) : null;
  }

  setReminderMoment(date) {
    this.reminderDatetime.value = date
      ? `${this.dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
      : '';
    this.renderReminderWhen();
  }

  // The button shows the chosen day and time ("Tue 3 March · 09:00")
  renderReminderWhen() {
    const moment = this.reminderMoment();
    const locale = this.getLocale();
    this.reminderWhenText.textContent = moment
      ? `${moment.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long' })} · ${moment.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
      : i18n.t('reminder.pick');
    this.reminderWhenBtn.classList.toggle('has-value', !!moment);
  }

  // ============ The picker ============

  showReminderPicker() {
    const moment = this.reminderMoment();
    const now = this.dashboardNow();
    this.pickerDay = moment ? this.dateKey(moment) : null;
    this.pickerHour = moment ? moment.getHours() : 9;
    this.pickerMinute = moment ? moment.getMinutes() : 0;
    const shown = moment || now;
    this.pickerMonth = new Date(shown.getFullYear(), shown.getMonth(), 1);
    this.renderReminderPicker();

    // Under the button, or above it when there is no room below
    const picker = this.reminderPicker;
    picker.classList.remove('hidden');
    const rect = this.reminderWhenBtn.getBoundingClientRect();
    const { width, height } = picker.getBoundingClientRect();
    const margin = 8;
    const below = rect.bottom + 4;
    const top =
      below + height <= window.innerHeight - margin
        ? below
        : Math.max(margin, rect.top - 4 - height);
    // Its right edge lines up with the button's
    picker.style.left = `${Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin))}px`;
    picker.style.top = `${top}px`;
    this.reminderWhenBtn.setAttribute('aria-expanded', 'true');
    this.scrollTimeColumns();
  }

  hideReminderPicker() {
    if (!this.reminderPicker || this.reminderPicker.classList.contains('hidden')) return;
    this.reminderPicker.classList.add('hidden');
    this.reminderWhenBtn.setAttribute('aria-expanded', 'false');
  }

  isReminderPickerOpen() {
    return !this.reminderPicker.classList.contains('hidden');
  }

  renderReminderPicker() {
    const locale = this.getLocale();
    const picker = this.reminderPicker;
    const month = this.pickerMonth;
    picker.querySelector('.date-picker-title').textContent = month.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });

    // Weeks start on Monday, like the overview's calendar
    const weekdays = picker.querySelector('.date-picker-weekdays');
    weekdays.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const label = document.createElement('span');
      label.textContent = new Date(2024, 0, 1 + i).toLocaleDateString(locale, {
        weekday: 'short',
      });
      weekdays.appendChild(label);
    }

    const today = this.dateKey(this.dashboardNow());
    const offset = (month.getDay() + 6) % 7;
    const days = picker.querySelector('.date-picker-days');
    days.innerHTML = '';
    for (let i = 0; i < 42; i++) {
      const date = new Date(month.getFullYear(), month.getMonth(), 1 - offset + i);
      const key = this.dateKey(date);
      const day = document.createElement('button');
      day.type = 'button';
      day.className = 'date-picker-day';
      day.dataset.day = key;
      day.textContent = date.getDate();
      day.classList.toggle('is-other-month', date.getMonth() !== month.getMonth());
      day.classList.toggle('is-today', key === today);
      day.classList.toggle('is-selected', key === this.pickerDay);
      // A reminder rings in the future: days before today cannot be chosen
      day.disabled = key < today;
      days.appendChild(day);
    }

    this.renderTimeColumn('hour', 24, 1, this.pickerHour);
    this.renderTimeColumn('minute', 60 / MINUTE_STEP, MINUTE_STEP, this.pickerMinute);
  }

  renderTimeColumn(unit, count, step, chosen) {
    const column = this.reminderPicker.querySelector(`.time-column[data-unit="${unit}"]`);
    column.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const value = i * step;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'time-option';
      item.dataset.value = value;
      item.textContent = pad(value);
      item.classList.toggle('is-selected', value === chosen);
      column.appendChild(item);
    }
  }

  // The chosen hour and minute sit in the middle of their columns
  scrollTimeColumns() {
    this.reminderPicker.querySelectorAll('.time-column').forEach((column) => {
      const item = column.querySelector('.is-selected');
      if (item) column.scrollTop = item.offsetTop - (column.clientHeight - item.offsetHeight) / 2;
    });
  }

  // Write the picker's day and time to the form; a time picked before a day goes on the next
  // time it comes (today, or tomorrow when it has passed)
  applyReminderPicker() {
    if (!this.pickerDay) {
      const now = this.dashboardNow();
      const at = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        this.pickerHour,
        this.pickerMinute
      );
      if (at <= now) at.setDate(at.getDate() + 1);
      this.pickerDay = this.dateKey(at);
    }
    const [y, m, d] = this.pickerDay.split('-').map(Number);
    this.setReminderMoment(new Date(y, m - 1, d, this.pickerHour, this.pickerMinute));
  }

  chooseReminderDay(key) {
    this.pickerDay = key;
    this.reminderPicker.querySelectorAll('.date-picker-day').forEach((day) => {
      day.classList.toggle('is-selected', day.dataset.day === key);
    });
    this.applyReminderPicker();
  }

  chooseReminderTime(unit, value) {
    if (unit === 'hour') this.pickerHour = value;
    else this.pickerMinute = value;
    this.reminderPicker
      .querySelectorAll(`.time-column[data-unit="${unit}"] .time-option`)
      .forEach((item) =>
        item.classList.toggle('is-selected', Number(item.dataset.value) === value)
      );
    this.applyReminderPicker();
  }

  // ============ Repeat ============

  setReminderRecurrence(value) {
    this.reminderRecurrence.value = value;
    this.reminderRepeat.querySelectorAll('.segment').forEach((segment) => {
      const on = segment.dataset.value === value;
      segment.classList.toggle('active', on);
      segment.setAttribute('aria-checked', String(on));
    });
    this.reminderRecurrence.dispatchEvent(new Event('change'));
  }

  // An empty form for the next reminder
  resetReminderForm() {
    this.hideReminderPicker();
    this.setReminderMoment(null);
    this.setReminderRecurrence('none');
    document.querySelectorAll('#reminderWeekdays .weekday-checkbox').forEach((box) => {
      box.checked = false;
    });
  }

  setupReminderForm() {
    const picker = this.reminderPicker;
    this.reminderWhenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isReminderPickerOpen()) this.hideReminderPicker();
      else this.showReminderPicker();
    });
    picker.addEventListener('click', (e) => {
      e.stopPropagation();
      const day = e.target.closest('.date-picker-day');
      const time = e.target.closest('.time-option');
      const step = e.target.closest('[data-month]');
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (day && !day.disabled) this.chooseReminderDay(day.dataset.day);
      else if (time)
        this.chooseReminderTime(time.parentElement.dataset.unit, Number(time.dataset.value));
      else if (step) {
        this.pickerMonth.setMonth(this.pickerMonth.getMonth() + Number(step.dataset.month));
        this.renderReminderPicker();
      } else if (action === 'clear') {
        this.setReminderMoment(null);
        this.hideReminderPicker();
      } else if (action === 'done') {
        this.hideReminderPicker();
      }
    });
    document.addEventListener('click', () => this.hideReminderPicker());
    window.addEventListener('resize', () => this.hideReminderPicker());
    // It stays next to its button: scrolling the panel closes it
    this.reminderWhenBtn
      .closest('.editor-sidebar')
      ?.addEventListener('scroll', () => this.hideReminderPicker());

    this.reminderRepeat.querySelectorAll('.segment').forEach((segment) => {
      segment.addEventListener('click', () => this.setReminderRecurrence(segment.dataset.value));
    });
    this.resetReminderForm();
  }
}
