/**
 * Capnote main process: app lifecycle and registration of the main-process features
 */

const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { JsonStore } = require('./storage');
const { registerUploadScheme, handleUploadProtocol, registerUploadIpc } = require('./uploads');
const {
  createMainWindow,
  getMainWindow,
  markQuitting,
  setCloseToTray,
  isCloseToTrayEnabled,
  supportsCloseToTray,
  registerWindowIpc,
} = require('./window');
const { createTray, registerTrayIpc } = require('./tray');
const { registerNotificationIpc } = require('./notifications');
const { registerAutostartIpc } = require('./autostart');
const { registerExportIpc } = require('./export-pdf');

// Enable hot reload in development using electron-reloader
try {
  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV !== 'production';
  if (isDev) {
    require('electron-reloader')(module, {
      watchRenderer: true,
      debug: false,
    });
    console.log('Electron reloader enabled (dev mode)');
  }
} catch (err) {
  // If electron-reloader isn't installed, ignore silently in production or CI
}

// Ensure the app name is set so native notifications and system UI show 'Capnote'
// (on Windows, AppUserModelID affects which app name/icon appears in notifications)
app.setAppUserModelId('Capnote');
app.name = 'Capnote';

registerUploadScheme();

// Notes, folders, reminders, notifications, todos and settings live in JSON files under userData
let dataStore = null;
function getDataStore() {
  if (!dataStore) dataStore = new JsonStore(app.getPath('userData'));
  return dataStore;
}

// The close-to-tray preference lives in the renderer's settings; versions before the file storage
// kept it in electron-store's config.json, which is read once as a fallback.
function readCloseToTrayPreference() {
  const settings = getDataStore().read('settings');
  if (settings && typeof settings.closeToTray === 'boolean') return settings.closeToTray;
  try {
    const legacy = JSON.parse(
      fs.readFileSync(path.join(app.getPath('userData'), 'config.json'), 'utf8')
    );
    if (legacy && legacy.settings && typeof legacy.settings.closeToTray === 'boolean') {
      return legacy.settings.closeToTray;
    }
  } catch {}
  return true;
}

function registerStorageIpc() {
  ipcMain.handle('storage:load', () => {
    const storage = getDataStore();
    return { initialized: storage.isInitialized(), data: storage.readAll() };
  });

  ipcMain.handle('storage:save', (event, key, value) => {
    if (value === undefined) throw new Error('Refusing to store undefined');
    getDataStore().write(key, value);
    return true;
  });
}

function registerCloseToTrayIpc() {
  ipcMain.handle('get-close-to-tray', () => {
    setCloseToTray(readCloseToTrayPreference());
    return { enabled: isCloseToTrayEnabled() };
  });

  ipcMain.handle('set-close-to-tray', (event, enabled) => {
    if (!supportsCloseToTray)
      return { ok: false, error: 'Close to tray is only supported on Windows' };
    // Persisted by the renderer together with the other settings
    setCloseToTray(enabled);
    return { ok: true };
  });
}

registerWindowIpc();
registerTrayIpc();
registerStorageIpc();
registerCloseToTrayIpc();
registerUploadIpc();
registerNotificationIpc();
registerAutostartIpc();
registerExportIpc();

app.whenReady().then(() => {
  handleUploadProtocol();
  setCloseToTray(readCloseToTrayPreference());
  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (getMainWindow()) {
      getMainWindow().show();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  markQuitting();
});
