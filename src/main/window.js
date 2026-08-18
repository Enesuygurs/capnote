// The main application window: creation, navigation lock-down, close-to-tray and window controls

const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
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

// Size, position and maximized state of the window, remembered between launches
function windowStateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    const state = JSON.parse(fs.readFileSync(windowStateFile(), 'utf8'));
    const { x, y, width, height } = state;
    if (![x, y, width, height].every(Number.isFinite)) return null;
    // Ignore a position on a display that is no longer connected
    const area = screen.getDisplayMatching({ x, y, width, height }).workArea;
    const visible =
      x < area.x + area.width &&
      x + width > area.x &&
      y < area.y + area.height &&
      y + height > area.y;
    return visible ? { x, y, width, height, maximized: !!state.maximized } : null;
  } catch {
    return null;
  }
}

function saveWindowState(win) {
  try {
    const state = { ...win.getNormalBounds(), maximized: win.isMaximized() };
    fs.writeFileSync(windowStateFile(), JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save the window state:', err);
  }
}

// Window background before the page paints, matching the app's light and dark --surface colors
const BACKGROUND = { light: '#fdfdfd', dark: '#1a1a1a' };

function createMainWindow({ darkMode = false, devTools = false } = {}) {
  // Determine icon path (prefer .ico on Windows if available)
  let iconPath = path.join(ICONS_DIR, 'capnote-512.png');
  if (process.platform === 'win32') {
    const icoPath = path.join(ICONS_DIR, 'capnote.ico');
    if (fs.existsSync(icoPath)) {
      iconPath = icoPath;
    }
  }

  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    ...(state && { x: state.x, y: state.y, width: state.width, height: state.height }),
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: PRELOAD_FILE,
    },
    // macOS keeps its native traffic-light buttons; other platforms use the custom titlebar
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform === 'darwin',
    show: false,
    icon: iconPath,
    backgroundColor: darkMode ? BACKGROUND.dark : BACKGROUND.light,
  });

  lockDownNavigation(mainWindow);
  mainWindow.loadFile(path.join(RENDERER_DIR, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    if (state && state.maximized) mainWindow.maximize();
    mainWindow.show();
  });

  // Intercept close to support close-to-tray behavior
  mainWindow.on('close', (e) => {
    saveWindowState(mainWindow);
    if (!isQuitting && closeToTrayEnabled) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  if (devTools) mainWindow.webContents.openDevTools();
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
