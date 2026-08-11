// Native operating-system notifications for reminders

const { ipcMain, Notification } = require('electron');
const { showMainWindow, getMainWindow } = require('./window');

function registerNotificationIpc() {
  ipcMain.handle('show-native-notification', (event, opts) => {
    try {
      const { title = '', body = '', silent = false, icon, notificationId = null } = opts || {};
      if (!Notification.isSupported()) return false;

      const notification = new Notification({
        // Use the app name when no title is given rather than an empty heading
        title: title || 'Capnote',
        body,
        silent,
        icon: icon || undefined,
      });
      // Clicking the notification opens the app and marks the entry as read
      notification.on('click', () => {
        showMainWindow();
        const win = getMainWindow();
        if (win) win.webContents.send('native-notif-click', notificationId);
      });
      notification.show();
      return true;
    } catch (err) {
      console.error('Failed to show native notification', err);
      return false;
    }
  });
}

module.exports = { registerNotificationIpc };
