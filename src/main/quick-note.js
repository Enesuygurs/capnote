// The quick note: Ctrl+Alt+N (Cmd+Alt+N on macOS) anywhere in the system opens a small window in
// the corner of the screen, always on top, to write a note without bringing the whole app forward.
// The note is handed to the main window, which keeps the notes and saves it. The shortcut can be
// turned off in the settings.

import path from 'path';
import { BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import { showMainWindow, getMainWindow, lockDownNavigation } from './window.js';
import { RENDERER_DIR, QUICK_NOTE_PRELOAD_FILE } from './paths.js';

const ACCELERATOR = 'CommandOrControl+Alt+N';
const SIZE = { width: 360, height: 300 };
// Distance from the corner of the screen's work area (above the taskbar)
const MARGIN = 16;
// The longest title and text a quick note takes
const MAX_TITLE = 500;
const MAX_TEXT = 100000;

let quickWindow = null;
// The app settings (language, theme, accent) the window opens with
let readSettings = () => ({});

// The bottom right corner of the screen the mouse is on
function cornerBounds() {
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  return {
    x: area.x + area.width - SIZE.width - MARGIN,
    y: area.y + area.height - SIZE.height - MARGIN,
    ...SIZE,
  };
}

function openQuickNote() {
  if (quickWindow) {
    quickWindow.show();
    quickWindow.focus();
    return;
  }
  const settings = readSettings() || {};
  const dark = !!settings.darkMode;
  quickWindow = new BrowserWindow({
    ...cornerBounds(),
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    title: 'Capnote',
    // The --surface colors, so nothing flashes before the page paints
    backgroundColor: dark ? '#1b1b1b' : '#f4f3ef',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: QUICK_NOTE_PRELOAD_FILE,
    },
  });
  // Above other always-on-top windows too, as a sticky note
  quickWindow.setAlwaysOnTop(true, 'floating');
  lockDownNavigation(quickWindow);
  quickWindow.loadFile(path.join(RENDERER_DIR, 'quick-note.html'), {
    query: {
      lang: settings.language === 'en' ? 'en' : 'tr',
      theme: dark ? 'dark' : 'light',
      accent: /^#[0-9a-f]{6}$/i.test(settings.accentColor || '') ? settings.accentColor : '',
    },
  });
  const win = quickWindow;
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });
  win.on('closed', () => {
    if (quickWindow === win) quickWindow = null;
  });
}

function closeQuickNote() {
  quickWindow?.close();
}

// A title and text from the window, as plain strings of a sane length
function cleanNote(note) {
  const title = typeof note?.title === 'string' ? note.title.slice(0, MAX_TITLE) : '';
  const text = typeof note?.text === 'string' ? note.text.slice(0, MAX_TEXT) : '';
  return { title, text };
}

// Turn the shortcut on or off. Registering fails when another app already uses the keys.
function setQuickNoteShortcut(enabled) {
  if (globalShortcut.isRegistered(ACCELERATOR)) globalShortcut.unregister(ACCELERATOR);
  if (!enabled) return { ok: true, enabled: false };
  const ok = globalShortcut.register(ACCELERATOR, openQuickNote);
  return ok ? { ok: true, enabled: true } : { ok: false, error: 'in-use' };
}

function registerQuickNoteIpc({ settings } = {}) {
  if (settings) readSettings = settings;
  ipcMain.handle('quick-note-shortcut:set', (event, enabled) => setQuickNoteShortcut(!!enabled));
  ipcMain.handle('quick-note-shortcut:get', () => ({
    enabled: globalShortcut.isRegistered(ACCELERATOR),
  }));

  // Only the quick note window may send these
  const fromQuickWindow = (event) => quickWindow && event.sender === quickWindow.webContents;

  // Save: the main window adds the note; the quick window closes
  ipcMain.handle('quick-note:save', (event, note) => {
    if (!fromQuickWindow(event)) return { ok: false };
    const main = getMainWindow();
    if (!main) return { ok: false, error: 'no-window' };
    main.webContents.send('quick-note:add', cleanNote(note));
    closeQuickNote();
    return { ok: true };
  });

  // Continue in the app: the main window opens it as a new note in the editor
  ipcMain.handle('quick-note:expand', (event, note) => {
    if (!fromQuickWindow(event)) return { ok: false };
    const main = getMainWindow();
    if (!main) return { ok: false, error: 'no-window' };
    showMainWindow();
    main.webContents.send('quick-note:open', cleanNote(note));
    closeQuickNote();
    return { ok: true };
  });

  ipcMain.on('quick-note:close', (event) => {
    if (fromQuickWindow(event)) closeQuickNote();
  });
}

export { setQuickNoteShortcut, registerQuickNoteIpc, openQuickNote };
