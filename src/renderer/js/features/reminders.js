// Reminders: scheduling, recurrence and firing

import { i18n } from '../i18n.js';

export class RemindersFeature {
  _computeNextRecurrence(datetimeIso, recurrence) {
    try {
      const dt = new Date(datetimeIso);
      if (isNaN(dt)) return null;
      let next = new Date(dt.getTime());
      switch (recurrence) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          // Basic weekly increment will be handled by caller when recurrenceDays are provided.
          next.setDate(next.getDate() + 7);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
        default:
          return null;
      }
      return next;
    } catch (err) {
      console.warn('Failed to compute next recurrence', err);
      return null;
    }
  }

  _computeNextWeeklyFromDays(datetimeIso, daysArray) {
    try {
      const base = new Date(datetimeIso);
      if (isNaN(base)) return null;
      // Normalize daysArray to sorted unique numbers 0..6
      const days = Array.from(
        new Set(
          (daysArray || []).map((d) => parseInt(d)).filter((d) => !isNaN(d) && d >= 0 && d <= 6)
        )
      ).sort((a, b) => a - b);
      if (days.length === 0) return null;

      // Start searching from the next minute to avoid returning the same moment
      const start = new Date(base.getTime() + 60000);
      for (let offset = 0; offset < 14; offset++) {
        const candidate = new Date(start.getTime());
        candidate.setDate(start.getDate() + offset);
        const wd = candidate.getDay();
        if (days.includes(wd)) {
          // Preserve the original time of day from base
          candidate.setHours(
            base.getHours(),
            base.getMinutes(),
            base.getSeconds(),
            base.getMilliseconds()
          );
          // If candidate is still <= base (unlikely due to start shift), continue
          if (candidate.getTime() <= base.getTime()) continue;
          return candidate;
        }
      }
      // Fallback: compute by adding 7 days to base
      const fallback = new Date(base.getTime());
      fallback.setDate(fallback.getDate() + 7);
      return fallback;
    } catch (err) {
      console.warn('Failed to compute weekly next from days', err);
      return null;
    }
  }

  _recurrenceLabel(code) {
    switch (code) {
      case 'daily':
        return i18n.t('reminder.daily');
      case 'weekly':
        return i18n.t('reminder.weekly');
      case 'monthly':
        return i18n.t('reminder.monthly');
      default:
        return '';
    }
  }

  _weekdayShort(n) {
    const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const idx = parseInt(n);
    if (isNaN(idx) || idx < 0 || idx > 6) return '';
    return i18n.t(`reminder.${keys[idx]}`);
  }

  updateRemindersView() {
    if (!this.remindersList) return;

    const activeReminders = this.reminders.filter(
      (r) => !r.dismissed && new Date(r.datetime) > new Date()
    );

    if (activeReminders.length === 0) {
      this.remindersList.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">${i18n.t('messages.noActiveReminders')}</div>`;
      return;
    }

    this.remindersList.innerHTML = activeReminders
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
      .map(
        (r) => `
        <div class="reminder-card" data-reminder-id="${r.id}">
          <div class="reminder-note-title">${this.escapeHtml(this.titleForNote(r.noteId, r.noteTitle))}</div>
          <div class="reminder-datetime">
            <i class="fas fa-clock"></i>
            ${new Date(r.datetime).toLocaleString(this.getLocale(), {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            ${r.recurrence && r.recurrence !== 'none' ? `<span class="reminder-recurrence">${this._recurrenceLabel(r.recurrence)}${r.recurrence === 'weekly' && Array.isArray(r.recurrenceDays) && r.recurrenceDays.length ? ': ' + r.recurrenceDays.map((d) => this._weekdayShort(d)).join(', ') : ''}</span>` : ''}
          </div>
          <div class="reminder-actions">
            <button class="reminder-action-btn view-note-btn" data-note-id="${r.noteId}">
              <i class="fas fa-eye"></i> ${i18n.t('messages.viewNote')}
            </button>
            <button class="reminder-action-btn dismiss-btn" data-reminder-id="${r.id}">
              <i class="fas fa-check"></i> ${i18n.t('messages.completed')}
            </button>
          </div>
        </div>
      `
      )
      .join('');

    // Add event listeners to action buttons
    this.remindersList.querySelectorAll('.view-note-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const noteId = e.currentTarget.dataset.noteId;
        const note = this.notes.find((n) => n.id === noteId);
        if (note) this.openNote(note);
      });
    });

    this.remindersList.querySelectorAll('.dismiss-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const reminderId = e.currentTarget.dataset.reminderId;
        this.dismissReminder(reminderId);
      });
    });
  }

  async addReminder() {
    if (!this.currentNote || !this.reminderDatetime?.value) {
      this.showNotification(i18n.t('messages.selectDateTime'), 'error');
      return;
    }

    // Check if note is saved (exists in notes array)
    const notExists = this.notes.some((n) => n.id === this.currentNote.id);
    if (!notExists) {
      this.showNotification(i18n.t('messages.saveNoteFirst'), 'warning');
      return;
    }

    const datetime = this.reminderDatetime.value;
    const reminderDate = new Date(datetime);
    const now = new Date();

    if (reminderDate <= now) {
      this.showNotification(i18n.t('messages.futureDateRequired'), 'error');
      return;
    }

    const reminder = {
      id: this.newId(),
      noteId: this.currentNote.id,
      noteTitle: this.currentNote.title || i18n.t('messages.untitledNote'),
      datetime: reminderDate.toISOString(),
      recurrence:
        this.reminderRecurrence && this.reminderRecurrence.value
          ? this.reminderRecurrence.value
          : 'none',
      dismissed: false,
      recurrenceDays: [],
    };

    // If weekly recurrence selected, collect checked weekdays (0=Sun..6=Sat)
    if (reminder.recurrence === 'weekly') {
      try {
        const checkboxes = document.querySelectorAll('#reminderWeekdays .weekday-checkbox');
        const days = [];
        checkboxes.forEach((cb) => {
          if (cb.checked) {
            const v = parseInt(cb.value);
            if (!isNaN(v)) days.push(v);
          }
        });
        // If user didn't pick any days, default to the weekday of the chosen date
        if (days.length === 0) {
          const d = new Date(datetime).getDay();
          days.push(d);
        }
        reminder.recurrenceDays = days.sort((a, b) => a - b);
      } catch (err) {
        // ignore
      }
    }

    this.reminders.push(reminder);
    await this.saveReminders();
    this.reminderDatetime.value = '';
    this.updateNoteRemindersDisplay();
    this.updateActiveRemindersCount();
    this.showNotification(i18n.t('messages.reminderAdded'), 'success');
  }

  async dismissReminder(reminderId) {
    const reminder = this.reminders.find((r) => r.id === reminderId);
    if (reminder) {
      reminder.dismissed = true;
      await this.saveReminders();
      this.updateRemindersView();
      this.updateNoteRemindersDisplay();
      this.updateActiveRemindersCount();
      this.showNotification(i18n.t('messages.reminderCompleted'), 'success');
    }
  }

  updateNoteRemindersDisplay() {
    if (!this.noteRemindersList || !this.currentNote) return;

    const noteReminders = this.reminders.filter(
      (r) => r.noteId === this.currentNote.id && !r.dismissed && new Date(r.datetime) > new Date()
    );

    if (noteReminders.length === 0) {
      this.noteRemindersList.innerHTML = `<div class="note-no-reminder">${i18n.t('stats.noReminder')}</div>`;
      return;
    }

    this.noteRemindersList.innerHTML = noteReminders
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
      .map(
        (r) => `
        <div class="note-reminder-item">
          <div class="note-reminder-time">
              <i class="fas fa-bell"></i>
              ${new Date(r.datetime).toLocaleString(this.getLocale(), {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              ${r.recurrence && r.recurrence !== 'none' ? ` <span class="reminder-recurrence">${this._recurrenceLabel(r.recurrence)}${r.recurrence === 'weekly' && Array.isArray(r.recurrenceDays) && r.recurrenceDays.length ? ': ' + r.recurrenceDays.map((d) => this._weekdayShort(d)).join(', ') : ''}</span>` : ''}
          </div>
          <button class="note-reminder-remove" data-reminder-id="${r.id}" title="${i18n.t('buttons.delete')}">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `
      )
      .join('');

    // Add remove event listeners
    this.noteRemindersList.querySelectorAll('.note-reminder-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const reminderId = e.currentTarget.dataset.reminderId;
        this.removeReminder(reminderId);
      });
    });
  }

  async removeReminder(reminderId) {
    this.reminders = this.reminders.filter((r) => r.id !== reminderId);
    await this.saveReminders();
    this.updateNoteRemindersDisplay();
    this.updateActiveRemindersCount();
    this.showNotification(i18n.t('messages.reminderDeleted'), 'info');
  }

  updateActiveRemindersCount() {
    if (!this.activeRemindersCount) return;
    const count = this.reminders.filter(
      (r) => !r.dismissed && new Date(r.datetime) > new Date()
    ).length;
    this.activeRemindersCount.textContent = `(${count})`;
  }

  startReminderChecker() {
    // Catch up on reminders that came due while the app was closed, then check every minute
    this.checkDueReminders();
    setInterval(() => this.checkDueReminders(), 60000);

    // Also update counts on init
    this.updateActiveRemindersCount();
    this.updateActiveNotificationsCount();
  }

  checkDueReminders() {
    const now = new Date();
    let hasNotification = false;

    this.reminders.forEach((reminder) => {
      if (reminder.dismissed || new Date(reminder.datetime) > now) return;

      // Being later than a couple of check intervals means the app was not running at that time
      const missed = now - new Date(reminder.datetime) > 2 * 60000;
      const locale = this.getLocale();
      const when = new Date(reminder.datetime).toLocaleString(locale);
      const body = `${i18n.t(missed ? 'messages.reminderMissed' : 'messages.reminderDue')} ${when}`;
      const noteTitle = this.titleForNote(reminder.noteId, reminder.noteTitle);

      // Add to notifications list and show a toast that references the notification id
      const nid = this.addNotification(reminder.noteId, noteTitle, body);
      this.showNotification(`${i18n.t('messages.reminderPrefix')} ${noteTitle}`, 'info', {
        notificationId: nid,
      });

      // Also trigger a native OS notification via the preload bridge if the user enabled it
      try {
        const nativePref = this.settings.nativeNotifications;
        if (
          nativePref &&
          window &&
          window.electronAPI &&
          typeof window.electronAPI.showNativeNotification === 'function'
        ) {
          window.electronAPI
            .showNativeNotification({
              title: `${i18n.t('messages.reminderNotification')} ${noteTitle}`,
              body,
              silent: false,
              notificationId: nid,
            })
            .catch((err) => console.warn('showNativeNotification rejected:', err));
        }
      } catch (err) {
        // Keep app functional if native notification call fails
        console.warn('Native notification error:', err);
      }

      this.scheduleNextOccurrence(reminder, now);
      hasNotification = true;
    });

    if (hasNotification) {
      this.saveReminders();
      this.updateRemindersView();
      this.updateNoteRemindersDisplay();
      this.updateActiveRemindersCount();
      this.updateActiveNotificationsCount();
    }
  }

  // Move a fired reminder to its next occurrence after `now`, or dismiss it.
  // Skipping past occurrences keeps a long absence from firing once per missed slot.
  scheduleNextOccurrence(reminder, now) {
    if (!reminder.recurrence || reminder.recurrence === 'none') {
      reminder.dismissed = true;
      return;
    }
    const weeklyDays =
      reminder.recurrence === 'weekly' &&
      Array.isArray(reminder.recurrenceDays) &&
      reminder.recurrenceDays.length > 0
        ? reminder.recurrenceDays
        : null;
    let next = new Date(reminder.datetime);
    for (let i = 0; i < 5000 && next <= now; i++) {
      const candidate = weeklyDays
        ? this._computeNextWeeklyFromDays(next.toISOString(), weeklyDays)
        : this._computeNextRecurrence(next.toISOString(), reminder.recurrence);
      if (!candidate) break;
      next = candidate;
    }
    if (next <= now) {
      reminder.dismissed = true;
    } else {
      reminder.datetime = next.toISOString();
    }
  }

  // Reminders and notifications show the note's current title; the stored copy is a fallback
  // for notes that no longer exist
  titleForNote(noteId, storedTitle) {
    const note = noteId ? this.notes.find((n) => n.id === noteId) : null;
    return note ? note.title : storedTitle;
  }
}
