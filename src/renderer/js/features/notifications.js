// Notification history (fired reminders)

import { i18n } from '../i18n.js';

export class NotificationsFeature {
  // kind is 'reminderDue', 'reminderMissed' or 'test'; at is the reminder time for reminders.
  // The text is not stored, so it follows the language the app is in when the list is shown.
  addNotification(noteId, noteTitle, kind, at = null) {
    const notification = {
      id: this.newId(),
      noteId: noteId,
      noteTitle: noteTitle,
      kind,
      at,
      time: new Date().toISOString(),
      read: false,
    };
    this.notifications.unshift(notification); // Add to beginning
    this.saveNotifications();
    this.updateNotificationsView();
    this.updateActiveNotificationsCount();
    return notification.id;
  }

  notificationTitle(n) {
    if (n.kind === 'test') return i18n.t('messages.testNotificationTitle');
    return this.titleForNote(n.noteId, n.noteTitle);
  }

  // Older notifications stored their text in the language of the time; it is shown as it was
  notificationMessage(n) {
    if (n.kind === 'test') return i18n.t('messages.testNotificationBody');
    if (n.kind === 'reminderDue' || n.kind === 'reminderMissed') {
      return `${i18n.t(`messages.${n.kind}`)} ${new Date(n.at).toLocaleString(this.getLocale())}`;
    }
    return n.message || '';
  }

  updateNotificationsView() {
    if (!this.notificationsList) return;

    if (this.notifications.length === 0) {
      this.notificationsList.innerHTML = `<div class="empty-state empty-state-large"><i class="fas fa-inbox"></i><p>${i18n.t('messages.noNotifications')}</p></div>`;
      return;
    }

    this.notificationsList.innerHTML = this.notifications
      .map(
        (n) => `
      <div class="list-card notification-card ${n.read ? '' : 'unread'}" data-notification-id="${n.id}">
        <div class="list-card-main">
          <div class="list-card-title">
            <span class="notification-note-title">${this.escapeHtml(this.notificationTitle(n))}</span>
          </div>
          <div class="list-card-meta">
            <span>${new Date(n.time).toLocaleString(this.getLocale(), {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</span>
          </div>
          <div class="list-card-text notification-message">${this.escapeHtml(this.notificationMessage(n))}</div>
        </div>
        <div class="list-card-actions">
          <button class="btn-tinted btn-small view-notification-note-btn" data-note-id="${n.noteId}">
            <i class="fas fa-eye"></i> ${i18n.t('messages.view')}
          </button>
          ${
            !n.read
              ? `
            <button class="btn-tinted btn-small mark-read-btn" data-notification-id="${n.id}">
              <i class="fas fa-check"></i> ${i18n.t('messages.markAsRead')}
            </button>
          `
              : ''
          }
          <button class="btn-outline btn-danger btn-small delete-notification-btn" data-notification-id="${n.id}">
            <i class="fas fa-trash"></i> ${i18n.t('messages.deleteNotification')}
          </button>
        </div>
      </div>
    `
      )
      .join('');

    // Add event listeners
    this.notificationsList.querySelectorAll('.view-notification-note-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const noteId = e.currentTarget.dataset.noteId;
        const note = this.notes.find((n) => n.id === noteId);
        if (note) this.openNote(note);
      });
    });

    this.notificationsList.querySelectorAll('.mark-read-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const notificationId = e.currentTarget.dataset.notificationId;
        this.markNotificationAsRead(notificationId);
      });
    });

    this.notificationsList.querySelectorAll('.delete-notification-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const notificationId = e.currentTarget.dataset.notificationId;
        this.deleteNotification(notificationId);
      });
    });
  }

  markNotificationAsRead(notificationId) {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
      this.updateNotificationsView();
      this.updateActiveNotificationsCount();
    }
  }

  deleteNotification(notificationId) {
    this.notifications = this.notifications.filter((n) => n.id !== notificationId);
    this.saveNotifications();
    this.updateNotificationsView();
    this.updateActiveNotificationsCount();
  }

  updateActiveNotificationsCount() {
    const unread = this.notifications.filter((n) => !n.read).length;
    this.setCount(this.activeNotificationsCount, unread, { emphasize: true });
  }

  markAllNotificationsRead() {
    if (!this.notifications || this.notifications.length === 0) return;
    let changed = false;
    this.notifications.forEach((n) => {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    });
    if (changed) {
      this.saveNotifications();
      this.updateNotificationsView();
      this.updateActiveNotificationsCount();
    }
  }
}
