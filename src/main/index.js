/**
 * Capnote main process: app lifecycle and registration of the main-process features
 */

import fs from 'fs';
import path from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { JsonStore } from './storage.js';
import { registerUploadScheme, handleUploadProtocol, registerUploadIpc } from './uploads.js';
import {
  createMainWindow,
  getMainWindow,
  showMainWindow,
  markQuitting,
  setCloseToTray,
  isCloseToTrayEnabled,
  supportsCloseToTray,
  registerWindowIpc,
} from './window.js';
import { createTray, registerTrayIpc } from './tray.js';
import { registerNotificationIpc } from './notifications.js';
import { registerAutostartIpc } from './autostart.js';
import { registerExportIpc } from './export-pdf.js';

// Development mode is 'npm run dev' from a source checkout: hot reload and DevTools
const isDev = !app.isPackaged && process.argv.includes('--dev');

// On Windows, notifications belong to the AppUserModelID. The installer registers the build appId
// on its shortcuts, so the installed app must use the same id; a source checkout has no shortcut.
const APP_ID = 'com.valkyr.capnote'; // keep in sync with build.appId in package.json
app.setAppUserModelId(app.isPackaged ? APP_ID : 'Capnote');
app.name = 'Capnote';

// Only one Capnote runs at a time; starting it again brings the existing window forward
const isPrimaryInstance = app.requestSingleInstanceLock();
if (!isPrimaryInstance) app.quit();
app.on('second-instance', () => showMainWindow());

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

function readDarkModePreference() {
  const settings = getDataStore().read('settings');
  return !!(settings && settings.darkMode);
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
  if (!isPrimaryInstance) return;
  handleUploadProtocol();
  setCloseToTray(readCloseToTrayPreference());
  createMainWindow({ darkMode: readDarkModePreference(), devTools: isDev });
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow({ darkMode: readDarkModePreference() });
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

// Hot reload comes last: awaiting the import lets the app become ready, and the setup above
// (such as registering the upload scheme) has to happen before that
if (isDev) {
  try {
    const reloader = await import('electron-reloader');
    reloader.default(import.meta, { watchRenderer: true });
  } catch (err) {
    console.warn('Hot reload is unavailable:', err.message);
  }
}
