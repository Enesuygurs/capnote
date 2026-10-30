// Updates from GitHub Releases for the installed app. macOS only installs signed updates and a
// source checkout has nothing to update, so updates run on the packaged Windows and Linux builds.

import electronUpdater from 'electron-updater';
import { app, ipcMain } from 'electron';

const { autoUpdater } = electronUpdater;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const updatesSupported = () => app.isPackaged && process.platform !== 'darwin';

// status: unsupported | idle | checking | none | downloading | ready | error
let state = { status: 'idle' };
let notifyRenderer = () => {};

function setState(next) {
  state = next;
  notifyRenderer(state);
}

function checkForUpdates() {
  // Failures (offline, no release yet) arrive through the 'error' event
  autoUpdater.checkForUpdates().catch(() => {});
}

// sendToRenderer(state) is called on every status change
function startUpdater(sendToRenderer) {
  notifyRenderer = sendToRenderer;
  if (!updatesSupported()) {
    state = { status: 'unsupported' };
    return;
  }
  // Real failures are logged below; the default logger also prints expected ones as errors
  autoUpdater.logger = null;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => setState({ status: 'checking' }));
  autoUpdater.on('update-not-available', () => setState({ status: 'none' }));
  autoUpdater.on('update-available', (info) =>
    setState({ status: 'downloading', version: info.version })
  );
  autoUpdater.on('update-downloaded', (info) =>
    setState({ status: 'ready', version: info.version })
  );
  autoUpdater.on('error', (err) => {
    const message = String((err && err.message) || err);
    // No release published yet means there is nothing newer, not a failure
    if (/\b404\b|No published versions|Unable to find latest version/i.test(message)) {
      setState({ status: 'none' });
      return;
    }
    console.warn('Update check failed:', message);
    setState({ status: 'error' });
  });
  checkForUpdates();
  setInterval(checkForUpdates, CHECK_INTERVAL_MS);
}

function registerUpdateIpc() {
  ipcMain.handle('app:info', () => ({ version: app.getVersion() }));
  ipcMain.handle('updates:state', () => state);
  ipcMain.handle('updates:check', () => {
    if (updatesSupported() && state.status !== 'downloading' && state.status !== 'ready') {
      checkForUpdates();
    }
    return state;
  });
  // Quitting runs the installer; the app starts again afterwards
  ipcMain.handle('updates:install', () => {
    if (state.status === 'ready') autoUpdater.quitAndInstall();
  });
}

export { startUpdater, registerUpdateIpc };
