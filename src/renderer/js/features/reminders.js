// Reminders: scheduling, recurrence and firing

import { i18n } from '../i18n.js';

export class RemindersFeature {
  // anchorDay: the day of month a monthly reminder was set for, so Jan 31 goes to Feb 28/29 and
  // then back to Mar 31 instead of drifting to the 3rd
  _computeNextRecurrence(datetimeIso, recurrence, anchorDay = null) {
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
        case 'monthly': {
          const day = anchorDay || dt.getDate();
          next.setDate(1);
          next.setMonth(next.getMonth() + 1);
          const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
          next.setDate(Math.min(day, lastDay));
          break;
        }
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

    // The upcoming section shows only while there is something coming up
    this.remindersList
      .closest('.page-section')
      ?.classList.toggle('hidden', !activeReminders.length);
    if (activeReminders.length === 0) {
      this.remindersList.innerHTML = '';
      return;
    }

    this.remindersList.innerHTML = activeReminders
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
      .map(
        (r) => `
        <div class="list-card reminder-card" data-reminder-id="${r.id}">
          <div class="list-card-main">
            <div class="list-card-title reminder-note-title">${this.escapeHtml(this.titleForNote(r.noteId, r.noteTitle))}</div>
            <div class="list-card-meta reminder-datetime">
              <span>${new Date(r.datetime).toLocaleString(this.getLocale(), {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</span>
              ${r.recurrence && r.recurrence !== 'none' ? `<span class="chip reminder-recurrence">${this._recurrenceLabel(r.recurrence)}${r.recurrence === 'weekly' && Array.isArray(r.recurrenceDays) && r.recurrenceDays.length ? ': ' + r.recurrenceDays.map((d) => this._weekdayShort(d)).join(', ') : ''}</span>` : ''}
            </div>
          </div>
          <div class="list-card-actions">
            <button class="btn-tinted btn-small view-note-btn" data-note-id="${r.noteId}">
              <i class="fas fa-eye"></i> ${i18n.t('messages.viewNote')}
            </button>
            <button class="btn-tinted btn-small dismiss-btn" data-reminder-id="${r.id}">
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
      // The first time falls on one of the picked days (the chosen date itself counts)
      if (!reminder.recurrenceDays.includes(reminderDate.getDay())) {
        const first = this._computeNextWeeklyFromDays(
          new Date(reminderDate.getTime() - 60000).toISOString(),
          reminder.recurrenceDays
        );
        if (first) reminder.datetime = first.toISOString();
      }
    }
    if (reminder.recurrence === 'monthly') reminder.anchorDay = reminderDate.getDate();

    this.reminders.push(reminder);
    await this.saveReminders();
    this.reminderDatetime.value = '';
    this.updateRemindersView();
    this.updateNoteRemindersDisplay();
    this.updateActiveRemindersCount();
    this.armReminderTimer();
    this.showNotification(i18n.t('messages.reminderAdded'), 'success');
  }

  // Completing a one-time reminder ends it; a recurring one moves on to its next time
  async dismissReminder(reminderId) {
    const reminder = this.reminders.find((r) => r.id === reminderId);
    if (reminder) {
      this.scheduleNextOccurrence(reminder, new Date(reminder.datetime));
      await this.saveReminders();
      this.updateRemindersView();
      this.updateNoteRemindersDisplay();
      this.updateActiveRemindersCount();
      this.armReminderTimer();
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
              ${r.recurrence && r.recurrence !== 'none' ? ` <span class="chip reminder-recurrence">${this._recurrenceLabel(r.recurrence)}${r.recurrence === 'weekly' && Array.isArray(r.recurrenceDays) && r.recurrenceDays.length ? ': ' + r.recurrenceDays.map((d) => this._weekdayShort(d)).join(', ') : ''}</span>` : ''}
          </div>
          <button class="btn-icon btn-icon-xs note-reminder-remove" data-reminder-id="${r.id}" title="${i18n.t('buttons.delete')}">
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
    this.updateRemindersView();
    this.updateNoteRemindersDisplay();
    this.updateActiveRemindersCount();
    this.armReminderTimer();
    this.showNotification(i18n.t('messages.reminderDeleted'), 'info');
  }

  updateActiveRemindersCount() {
    if (!this.activeRemindersCount) return;
    const count = this.reminders.filter(
      (r) => !r.dismissed && new Date(r.datetime) > new Date()
    ).length;
    this.setCount(this.activeRemindersCount, count);
  }

  startReminderChecker() {
    // Catch up on reminders that came due while the app was closed. A timer fires the next one
    // on time; the minute check and the focus/visibility checks catch up after sleep or the tray.
    this.checkDueReminders();
    setInterval(() => this.checkDueReminders(), 60000);
    window.addEventListener('focus', () => this.checkDueReminders());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.checkDueReminders();
    });

    // Also update counts on init
    this.updateActiveRemindersCount();
    this.updateActiveNotificationsCount();
  }

  // Wake up when the next reminder is due
  armReminderTimer() {
    clearTimeout(this.reminderTimer);
    const next = this.reminders
      .filter((r) => !r.dismissed)
      .map((r) => new Date(r.datetime).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b)[0];
    if (next === undefined) return;
    // setTimeout holds at most ~24.8 days; the minute check covers anything later
    const delay = Math.min(Math.max(next - Date.now(), 0) + 50, 2 ** 31 - 1);
    this.reminderTimer = setTimeout(() => this.checkDueReminders(), delay);
  }

  checkDueReminders() {
    const now = new Date();
    let hasNotification = false;
    let changed = false;

    this.reminders.forEach((reminder) => {
      if (reminder.dismissed) return;
      // A reminder without a valid time can never fire; drop it instead of failing every check
      if (isNaN(new Date(reminder.datetime))) {
        reminder.dismissed = true;
        changed = true;
        return;
      }
      if (new Date(reminder.datetime) > now) return;

      // Being later than a couple of check intervals means the app was not running at that time
      const missed = now - new Date(reminder.datetime) > 2 * 60000;
      const kind = missed ? 'reminderMissed' : 'reminderDue';
      const noteTitle = this.titleForNote(reminder.noteId, reminder.noteTitle);

      // Add to notifications list and show a toast that references the notification id
      const nid = this.addNotification(reminder.noteId, noteTitle, kind, reminder.datetime);
      const body = this.notificationMessage({ kind, at: reminder.datetime });
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

    if (hasNotification || changed) {
      this.saveReminders();
      this.updateRemindersView();
      this.updateNoteRemindersDisplay();
      this.updateActiveRemindersCount();
      this.updateActiveNotificationsCount();
    }
    this.armReminderTimer();
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
        : this._computeNextRecurrence(next.toISOString(), reminder.recurrence, reminder.anchorDay);
      if (!candidate) break;
      next = candidate;
    }
    if (isNaN(next) || next <= now) {
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

  // Weekday picker for weekly reminders
  setupReminderEvents() {
    // Show/hide weekday selector when recurrence changes
    if (this.reminderRecurrence) {
      this.reminderRecurrence.addEventListener('change', (e) => {
        try {
          const val = e.currentTarget.value;
          const wk = document.getElementById('reminderWeekdays');
          if (wk) {
            if (val === 'weekly') {
              wk.classList.remove('hidden');
              wk.setAttribute('aria-hidden', 'false');
            } else {
              wk.classList.add('hidden');
              wk.setAttribute('aria-hidden', 'true');
            }
          }
        } catch (err) {}
      });
    }
  }
}
