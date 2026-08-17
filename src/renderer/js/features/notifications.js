// Notification history (fired reminders)

import { i18n } from '../i18n.js';

export class NotificationsFeature {
  addNotification(noteId, noteTitle, message) {
    const notification = {
      id: this.newId(),
      noteId: noteId,
      noteTitle: noteTitle,
      message: message,
      time: new Date().toISOString(),
      read: false,
    };
    this.notifications.unshift(notification); // Add to beginning
    this.saveNotifications();
    this.updateNotificationsView();
    this.updateActiveNotificationsCount();
    return notification.id;
  }

  updateNotificationsView() {
    if (!this.notificationsList) return;

    if (this.notifications.length === 0) {
      this.notificationsList.innerHTML = `<div class="empty-state empty-state-large">${i18n.t('messages.noNotifications')}</div>`;
      return;
    }

    this.notificationsList.innerHTML = this.notifications
      .map(
        (n) => `
      <div class="notification-card ${n.read ? '' : 'unread'}" data-notification-id="${n.id}">
        <div class="notification-header">
          <div class="notification-note-title">${this.escapeHtml(this.titleForNote(n.noteId, n.noteTitle))}</div>
          <div class="notification-time">
            <i class="fas fa-clock"></i>
            ${new Date(n.time).toLocaleString(this.getLocale(), {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
        <div class="notification-message">${this.escapeHtml(n.message)}</div>
        <div class="notification-actions">
          <button class="notification-action-btn view-notification-note-btn" data-note-id="${n.noteId}">
            <i class="fas fa-eye"></i> ${i18n.t('messages.view')}
          </button>
          ${
            !n.read
              ? `
            <button class="notification-action-btn mark-read-btn" data-notification-id="${n.id}">
              <i class="fas fa-check"></i> ${i18n.t('messages.markAsRead')}
            </button>
          `
              : ''
          }
          <button class="notification-action-btn delete-notification-btn" data-notification-id="${n.id}">
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
