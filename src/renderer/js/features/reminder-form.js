// The reminder form in the editor's side panel: a date button (a month calendar) and a time button
// (hour and minute columns), how often it repeats and on which days. It fills the hidden
// #reminderDatetime and #reminderRecurrence fields that addReminder reads.

import { i18n } from '../i18n.js';

const pad = (n) => String(n).padStart(2, '0');
const MINUTE_STEP = 5;

export class ReminderFormFeature {
  dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  // The hidden field addReminder reads: the chosen day at the chosen time
  syncReminderDatetime() {
    const { reminderDay: day, reminderTime: time } = this;
    this.reminderDatetime.value = day && time ? `${day}T${pad(time.hour)}:${pad(time.minute)}` : '';
    this.renderReminderWhen();
  }

  setReminderMoment(date) {
    this.reminderDay = date ? this.dateKey(date) : null;
    this.reminderTime = date ? { hour: date.getHours(), minute: date.getMinutes() } : null;
    this.syncReminderDatetime();
  }

  // The buttons show the chosen day ("Thu 5 March") and time ("18:30")
  renderReminderWhen() {
    const { reminderDay: day, reminderTime: time } = this;
    const date = day ? new Date(`${day}T00:00`) : null;
    this.reminderDateBtn.querySelector('.reminder-when-text').textContent = date
      ? date.toLocaleDateString(this.getLocale(), {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
        })
      : i18n.t('reminder.date');
    this.reminderTimeBtn.querySelector('.reminder-when-text').textContent = time
      ? `${pad(time.hour)}:${pad(time.minute)}`
      : i18n.t('reminder.time');
    this.reminderDateBtn.classList.toggle('has-value', !!day);
    this.reminderTimeBtn.classList.toggle('has-value', !!time);
  }

  // A day without a time rings at 09:00
  chooseReminderDay(key) {
    this.reminderDay = key;
    if (!this.reminderTime) this.reminderTime = { hour: 9, minute: 0 };
    this.syncReminderDatetime();
    this.hideReminderPickers();
  }

  // A time without a day goes on the next time it comes (today, or tomorrow when it has passed)
  chooseReminderTime(unit, value) {
    this.reminderTime = { hour: 9, minute: 0, ...this.reminderTime, [unit]: value };
    if (!this.reminderDay) {
      const now = this.dashboardNow();
      const { hour, minute } = this.reminderTime;
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
      if (at <= now) at.setDate(at.getDate() + 1);
      this.reminderDay = this.dateKey(at);
    }
    this.renderTimePicker();
    this.syncReminderDatetime();
  }

  // ============ The pickers ============

  // Open a picker under its button (above it when there is no room), its right edge on the
  // button's; a second click on the button closes it
  toggleReminderPicker(picker, button) {
    const wasOpen = !picker.classList.contains('hidden');
    this.hideReminderPickers();
    if (wasOpen) return;
    if (picker === this.reminderPicker) {
      const shown = this.reminderDay ? new Date(`${this.reminderDay}T00:00`) : this.dashboardNow();
      this.pickerMonth = new Date(shown.getFullYear(), shown.getMonth(), 1);
      this.renderDatePicker();
    } else {
      this.renderTimePicker();
    }
    picker.classList.remove('hidden');
    const rect = button.getBoundingClientRect();
    const { width, height } = picker.getBoundingClientRect();
    const margin = 8;
    const below = rect.bottom + 4;
    const top =
      below + height <= window.innerHeight - margin
        ? below
        : Math.max(margin, rect.top - 4 - height);
    picker.style.left = `${Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin))}px`;
    picker.style.top = `${top}px`;
    button.setAttribute('aria-expanded', 'true');
    if (picker === this.reminderTimePicker) this.scrollTimeColumns();
  }

  hideReminderPickers() {
    [
      [this.reminderPicker, this.reminderDateBtn],
      [this.reminderTimePicker, this.reminderTimeBtn],
    ].forEach(([picker, button]) => {
      if (!picker || picker.classList.contains('hidden')) return;
      picker.classList.add('hidden');
      button.setAttribute('aria-expanded', 'false');
    });
  }

  renderDatePicker() {
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
      day.classList.toggle('is-selected', key === this.reminderDay);
      // A reminder rings in the future: days before today cannot be chosen
      day.disabled = key < today;
      days.appendChild(day);
    }
  }

  renderTimePicker() {
    const time = this.reminderTime;
    this.renderTimeColumn('hour', 24, 1, time ? time.hour : null);
    this.renderTimeColumn('minute', 60 / MINUTE_STEP, MINUTE_STEP, time ? time.minute : null);
  }

  renderTimeColumn(unit, count, step, chosen) {
    const column = this.reminderTimePicker.querySelector(`.time-column[data-unit="${unit}"]`);
    const scroll = column.scrollTop;
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
    column.scrollTop = scroll;
  }

  // The chosen hour and minute (09:00 when nothing is chosen) sit in the middle of their columns
  scrollTimeColumns() {
    const anchor = this.reminderTime || { hour: 9, minute: 0 };
    this.reminderTimePicker.querySelectorAll('.time-column').forEach((column) => {
      const item = column.querySelector(
        `.time-option[data-value="${anchor[column.dataset.unit]}"]`
      );
      if (item) column.scrollTop = item.offsetTop - (column.clientHeight - item.offsetHeight) / 2;
    });
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
    this.hideReminderPickers();
    this.setReminderMoment(null);
    this.setReminderRecurrence('none');
    document.querySelectorAll('#reminderWeekdays .weekday-checkbox').forEach((box) => {
      box.checked = false;
    });
  }

  setupReminderForm() {
    this.reminderDateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleReminderPicker(this.reminderPicker, this.reminderDateBtn);
    });
    this.reminderTimeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleReminderPicker(this.reminderTimePicker, this.reminderTimeBtn);
    });
    this.reminderPicker.addEventListener('click', (e) => {
      e.stopPropagation();
      const day = e.target.closest('.date-picker-day');
      const step = e.target.closest('[data-month]');
      if (day && !day.disabled) this.chooseReminderDay(day.dataset.day);
      else if (step) {
        this.pickerMonth.setMonth(this.pickerMonth.getMonth() + Number(step.dataset.month));
        this.renderDatePicker();
      }
    });
    this.reminderTimePicker.addEventListener('click', (e) => {
      e.stopPropagation();
      const time = e.target.closest('.time-option');
      if (time) {
        this.chooseReminderTime(time.parentElement.dataset.unit, Number(time.dataset.value));
      } else if (e.target.closest('[data-action="done"]')) {
        this.hideReminderPickers();
      }
    });
    document.addEventListener('click', () => this.hideReminderPickers());
    window.addEventListener('resize', () => this.hideReminderPickers());
    // They stay next to their buttons: scrolling the panel closes them
    this.reminderDateBtn
      .closest('.editor-sidebar')
      ?.addEventListener('scroll', () => this.hideReminderPickers());

    this.reminderRepeat.querySelectorAll('.segment').forEach((segment) => {
      segment.addEventListener('click', () => this.setReminderRecurrence(segment.dataset.value));
    });
    this.resetReminderForm();
  }
}
