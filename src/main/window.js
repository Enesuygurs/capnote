// The main application window: creation, navigation lock-down, close-to-tray and window controls

const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const { BrowserWindow, ipcMain, shell } = require('electron');
const { ICONS_DIR, RENDERER_DIR, PRELOAD_FILE, uploadsDir } = require('./paths');
const { uploadPathFromUrl } = require('./uploads');

let mainWindow = null;
let isQuitting = false;

// Close-to-tray is a Windows-only feature (the setting is only shown there)
const supportsCloseToTray = process.platform === 'win32';
let closeToTrayEnabled = supportsCloseToTray;

function getMainWindow() {
  return mainWindow;
}

// Called when the app is really quitting, so closing the window is no longer intercepted
function markQuitting() {
  isQuitting = true;
}

function setCloseToTray(enabled) {
  closeToTrayEnabled = supportsCloseToTray && !!enabled;
}

function isCloseToTrayEnabled() {
  return closeToTrayEnabled;
}

/**
 * Opens a link from note content outside the app: web and mail links in the default browser,
 * files saved in the uploads folder with their default application. Anything else is ignored.
 */
function openExternalLink(url) {
  try {
    if (/^(https?|mailto):/i.test(url)) {
      shell.openExternal(url);
      return;
    }
    if (/^capnote-file:/i.test(url)) {
      const filePath = uploadPathFromUrl(url);
      if (filePath) shell.openPath(filePath);
      return;
    }
    if (/^file:/i.test(url)) {
      const filePath = fileURLToPath(url);
      if (filePath.startsWith(uploadsDir() + path.sep)) shell.openPath(filePath);
    }
  } catch (err) {
    console.warn('Could not open link:', url, err);
  }
}

/**
 * The app window must never navigate away from the app or spawn new windows:
 * links inside notes are handed to the operating system instead.
 */
function lockDownNavigation(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalLink(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url === win.webContents.getURL()) return;
    event.preventDefault();
    openExternalLink(url);
  });
}

function createMainWindow() {
  // Determine icon path (prefer .ico on Windows if available)
  let iconPath = path.join(ICONS_DIR, 'capnote-512.png');
  if (process.platform === 'win32') {
    const icoPath = path.join(ICONS_DIR, 'capnote.ico');
    if (fs.existsSync(icoPath)) {
      iconPath = icoPath;
    }
  }

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: PRELOAD_FILE,
      enableBlinkFeatures: 'OverlayScrollbars',
      offscreen: false,
      hardwareAcceleration: true,
    },
    // macOS keeps its native traffic-light buttons; other platforms use the custom titlebar
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform === 'darwin',
    show: false,
    vibrancy: 'under-window',
    transparent: false,
    icon: iconPath,
    backgroundColor: '#ffffff',
    // Improve resize performance
    useContentSize: false,
  });

  lockDownNavigation(mainWindow);
  mainWindow.loadFile(path.join(RENDERER_DIR, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Intercept close to support close-to-tray behavior
  mainWindow.on('close', (e) => {
    if (!isQuitting && closeToTrayEnabled) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
  return mainWindow;
}

// Bring the window to the front, restoring it if it was minimized
function showMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

// Custom titlebar buttons
function registerWindowIpc() {
  ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('maximize-window', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });

  ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
  });
}

module.exports = {
  createMainWindow,
  getMainWindow,
  showMainWindow,
  markQuitting,
  setCloseToTray,
  isCloseToTrayEnabled,
  supportsCloseToTray,
  registerWindowIpc,
};
