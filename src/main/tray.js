// System tray icon and its menu.
//
// The menu is Electron's own. On Windows its rows have the app's icons (made by `npm run icons` into
// assets/icons/menu, a gray for the light and one for the dark theme), it follows the app's theme
// (nativeTheme), and it has a title row, a quick note row (with its shortcut when that is on) and
// the recent notes. The page reports the theme and the recent notes (never a locked one).

import fs from 'fs';
import path from 'path';
import { app, Tray, Menu, nativeImage, nativeTheme, ipcMain } from 'electron';
import { ICONS_DIR } from './paths.js';
import { getMainWindow, showMainWindow, markQuitting } from './window.js';
import { openQuickNote, isQuickNoteShortcutOn, onQuickNoteShortcutChange } from './quick-note.js';

let tray = null;
let trayLanguage = 'tr';
// What the page reports: the theme, and the notes edited last (id and title)
let trayDark = false;
let recentNotes = [];
const MAX_RECENT = 5;
const MAX_TITLE = 40;
// Icons on the rows: Windows only (macOS and Linux draw their menus their own way)
const ROW_ICONS = process.platform === 'win32';

// Tray menu labels; the renderer reports the selected UI language
const TRAY_LABELS = {
  tr: {
    show: 'Göster',
    hide: 'Gizle',
    newNote: 'Yeni Not',
    quickNote: 'Hızlı Not',
    recent: 'Son notlar',
    notifications: 'Bildirimler',
    settings: 'Ayarlar',
    quit: 'Çıkış',
  },
  en: {
    show: 'Show',
    hide: 'Hide',
    newNote: 'New Note',
    quickNote: 'Quick Note',
    recent: 'Recent notes',
    notifications: 'Notifications',
    settings: 'Settings',
    quit: 'Quit',
  },
};

function resolveTrayIcon() {
  const png16 = path.join(ICONS_DIR, 'capnote-16.png');
  const png32 = path.join(ICONS_DIR, 'capnote-32.png');

  if (process.platform === 'win32') {
    const ico = path.join(ICONS_DIR, 'capnote.ico');
    if (fs.existsSync(ico)) return nativeImage.createFromPath(ico);
    if (fs.existsSync(png32)) return nativeImage.createFromPath(png32);
    if (fs.existsSync(png16)) return nativeImage.createFromPath(png16);
  } else if (process.platform === 'darwin') {
    // macOS: a black template image that the menu bar recolors (trayTemplate@2x.png loads on Retina)
    const template = path.join(ICONS_DIR, 'trayTemplate.png');
    if (fs.existsSync(template)) {
      const img = nativeImage.createFromPath(template);
      img.setTemplateImage(true);
      return img;
    }
  } else {
    // Linux: prefer 22-24px; resize from 32 if available
    if (fs.existsSync(png32))
      return nativeImage.createFromPath(png32).resize({ width: 22, height: 22 });
    if (fs.existsSync(png16)) return nativeImage.createFromPath(png16);
  }
  return null;
}

// A row's icon in the theme's gray (name@2x.png is picked on scaled screens); none if missing
const iconCache = new Map();
function rowIcon(name) {
  if (!ROW_ICONS) return undefined;
  const file = path.join(ICONS_DIR, 'menu', `${name}-${trayDark ? 'dark' : 'light'}.png`);
  if (!iconCache.has(file)) {
    const image = fs.existsSync(file) ? nativeImage.createFromPath(file) : null;
    iconCache.set(file, image && !image.isEmpty() ? image : undefined);
  }
  return iconCache.get(file);
}

// Show the window and tell the renderer which screen to open
function openInApp(channel, ...args) {
  const win = getMainWindow();
  if (!win) return;
  // Restored too when it was minimized ("Hide" minimizes it)
  showMainWindow();
  win.webContents.send(channel, ...args);
}

function hideMainWindow() {
  const win = getMainWindow();
  if (!win) return;
  if (win.isFullScreen()) win.setFullScreen(false);
  win.minimize();
}

const shorten = (title) =>
  title.length > MAX_TITLE ? `${title.slice(0, MAX_TITLE - 1).trimEnd()}…` : title;

function updateTrayMenu() {
  if (!tray) return;
  const labels = TRAY_LABELS[trayLanguage] || TRAY_LABELS.tr;
  // Electron draws its menus in the theme it is given
  nativeTheme.themeSource = trayDark ? 'dark' : 'light';
  const win = getMainWindow();
  const shown = !!win && win.isVisible() && !win.isMinimized();
  const recent = recentNotes.map((note) => ({
    label: shorten(note.title),
    icon: rowIcon('note'),
    click: () => openInApp('tray:open-note', note.id),
  }));
  const template = [
    // The app's name, a title row (it cannot be chosen, so it shows dimmed)
    {
      label: 'Capnote',
      icon: ROW_ICONS ? path.join(ICONS_DIR, 'capnote-16.png') : undefined,
      enabled: false,
    },
    { type: 'separator' },
    shown
      ? { label: labels.hide, icon: rowIcon('hide'), click: hideMainWindow }
      : { label: labels.show, icon: rowIcon('show'), click: () => showMainWindow() },
    { type: 'separator' },
    { label: labels.newNote, icon: rowIcon('newNote'), click: () => openInApp('new-note') },
    {
      label: labels.quickNote,
      icon: rowIcon('quickNote'),
      // Only shown, the shortcut itself is the system-wide one (quick-note.js)
      accelerator: isQuickNoteShortcutOn() ? 'CommandOrControl+Alt+N' : undefined,
      registerAccelerator: false,
      click: () => openQuickNote(),
    },
    ...(recent.length ? [{ label: labels.recent, icon: rowIcon('recent'), submenu: recent }] : []),
    {
      label: labels.notifications,
      icon: rowIcon('notifications'),
      click: () => openInApp('open-notifications'),
    },
    { label: labels.settings, icon: rowIcon('settings'), click: () => openInApp('open-settings') },
    { type: 'separator' },
    {
      label: labels.quit,
      icon: rowIcon('quit'),
      click: () => {
        markQuitting();
        app.quit();
      },
    },
  ];
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

// Show or Hide follows the window: the menu is made again when it is shown, hidden or minimized
function followWindow(win) {
  if (!win) return;
  ['show', 'hide', 'minimize', 'restore'].forEach((event) => win.on(event, updateTrayMenu));
}

function createTray({ settings } = {}) {
  try {
    trayDark = !!(settings?.() || {}).darkMode;
    const icon = resolveTrayIcon();
    if (!icon && process.platform !== 'win32') {
      console.warn('Tray icon asset not found; skipping tray on this platform');
      return;
    }
    tray = new Tray(icon || undefined);
    tray.setToolTip('Capnote');
    updateTrayMenu();
    followWindow(getMainWindow());
    onQuickNoteShortcutChange(updateTrayMenu);
    tray.on('click', () => {
      if (process.platform === 'darwin') {
        // macOS: Don't auto-show the window on click; show the tray menu instead
        tray.popUpContextMenu();
        return;
      }
      const win = getMainWindow();
      if (!win) return;
      // Other platforms: toggle visibility on left-click for convenience
      // A minimized window counts as visible; it is restored, not hidden
      if (win.isVisible() && !win.isMinimized()) win.hide();
      else showMainWindow();
    });
  } catch (err) {
    console.warn('Failed to create system tray:', err);
  }
}

// A note's id and title from the page, as plain values of a sane size
function cleanRecent(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((n) => n && (typeof n.id === 'string' || typeof n.id === 'number'))
    .slice(0, MAX_RECENT)
    .map((n) => ({ id: n.id, title: String(n.title || '').slice(0, 200) }));
}

function registerTrayIpc() {
  // The renderer reports the UI language so the tray menu can follow it
  ipcMain.on('set-language', (event, lang) => {
    if (!TRAY_LABELS[lang]) return;
    trayLanguage = lang;
    updateTrayMenu();
  });
  // The theme and the recent notes, sent by the page when they change
  ipcMain.on('tray:state', (event, state) => {
    const win = getMainWindow();
    if (!win || event.sender !== win.webContents) return;
    trayDark = !!state?.dark;
    recentNotes = cleanRecent(state?.recent);
    updateTrayMenu();
  });
}

export { createTray, registerTrayIpc };
