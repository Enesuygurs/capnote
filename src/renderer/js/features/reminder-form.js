// The reminder form in the editor's side panel: quick choices (in an hour, this evening, tomorrow
// morning, next week), a date and a time, how often it repeats and on which days. It fills the
// hidden #reminderDatetime and #reminderRecurrence fields that addReminder reads.

const pad = (n) => String(n).padStart(2, '0');

export class ReminderFormFeature {
  // The moment a quick choice stands for, or null when it no longer makes sense (this evening,
  // once it is evening). "Now" is the overview's, so tests can fix it.
  reminderPresetTime(name) {
    const now = this.dashboardNow();
    const at = (days, hours) =>
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hours, 0, 0);
    switch (name) {
      case 'hour': {
        const next = new Date(now.getTime() + 60 * 60 * 1000);
        next.setSeconds(0, 0);
        return next;
      }
      case 'evening':
        return now.getHours() < 19 ? at(0, 20) : null;
      case 'tomorrow':
        return at(1, 9);
      case 'nextWeek':
        // Next Monday at 09:00
        return at((8 - now.getDay()) % 7 || 7, 9);
      default:
        return null;
    }
  }

  // The hidden field addReminder reads; a date without a time means 09:00
  syncReminderDatetime() {
    const date = this.reminderDateInput.value;
    const time = this.reminderTimeInput.value || '09:00';
    this.reminderDatetime.value = date ? `${date}T${time}` : '';
  }

  markReminderPreset(name) {
    this.reminderPresets.querySelectorAll('.reminder-preset').forEach((button) => {
      button.classList.toggle('active', button.dataset.preset === name);
    });
  }

  chooseReminderPreset(name) {
    const moment = this.reminderPresetTime(name);
    if (!moment) return;
    this.reminderDateInput.value = `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}`;
    this.reminderTimeInput.value = `${pad(moment.getHours())}:${pad(moment.getMinutes())}`;
    this.syncReminderDatetime();
    this.markReminderPreset(name);
  }

  setReminderRecurrence(value) {
    this.reminderRecurrence.value = value;
    this.reminderRepeat.querySelectorAll('.segment').forEach((segment) => {
      const on = segment.dataset.value === value;
      segment.classList.toggle('active', on);
      segment.setAttribute('aria-checked', String(on));
    });
    this.reminderRecurrence.dispatchEvent(new Event('change'));
  }

  // Each quick choice shows when it would ring; one that no longer makes sense is hidden
  refreshReminderPresets() {
    const locale = this.getLocale();
    const time = { hour: '2-digit', minute: '2-digit' };
    this.reminderPresets.querySelectorAll('.reminder-preset').forEach((button) => {
      const moment = this.reminderPresetTime(button.dataset.preset);
      button.hidden = !moment;
      if (!moment) return;
      button.querySelector('small').textContent =
        button.dataset.preset === 'nextWeek'
          ? `${moment.toLocaleDateString(locale, { weekday: 'short' })} ${moment.toLocaleTimeString(locale, time)}`
          : moment.toLocaleTimeString(locale, time);
    });
  }

  // An empty form for the next reminder
  resetReminderForm() {
    this.reminderDateInput.value = '';
    this.reminderTimeInput.value = '';
    this.reminderDatetime.value = '';
    this.markReminderPreset(null);
    this.setReminderRecurrence('none');
    document.querySelectorAll('#reminderWeekdays .weekday-checkbox').forEach((box) => {
      box.checked = false;
    });
    this.refreshReminderPresets();
  }

  setupReminderForm() {
    this.reminderPresets.querySelectorAll('.reminder-preset').forEach((button) => {
      button.addEventListener('click', () => this.chooseReminderPreset(button.dataset.preset));
    });
    // The times move on while the app is open
    this.reminderPresets.addEventListener('pointerenter', () => this.refreshReminderPresets());
    [this.reminderDateInput, this.reminderTimeInput].forEach((input) => {
      input.addEventListener('input', () => {
        this.syncReminderDatetime();
        this.markReminderPreset(null);
      });
      // Clicking the field opens the date or time picker
      input.closest('.reminder-field').addEventListener('click', () => {
        try {
          input.showPicker();
        } catch {
          input.focus();
        }
      });
    });
    this.reminderRepeat.querySelectorAll('.segment').forEach((segment) => {
      segment.addEventListener('click', () => this.setReminderRecurrence(segment.dataset.value));
    });
    this.resetReminderForm();
  }
}
