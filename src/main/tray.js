// System tray icon and its menu. On Windows the menu is Capnote's own (tray-menu.js), in the app's
// theme and accent; elsewhere it is the system's.

import fs from 'fs';
import path from 'path';
import { app, Tray, Menu, nativeImage, ipcMain } from 'electron';
import { ICONS_DIR } from './paths.js';
import { getMainWindow, showMainWindow, markQuitting } from './window.js';
import { openQuickNote, isQuickNoteShortcutOn } from './quick-note.js';
import { openTrayMenu, prepareTrayMenu, registerTrayMenuIpc } from './tray-menu.js';

let tray = null;
let trayLanguage = 'tr';
// The app settings (theme, accent) the menu is drawn with
let readSettings = () => ({});
const customMenu = process.platform === 'win32';

// Tray menu labels; the renderer reports the selected UI language
const TRAY_LABELS = {
  tr: {
    show: 'Göster',
    hide: 'Gizle',
    newNote: 'Yeni Not',
    quickNote: 'Hızlı Not',
    notifications: 'Bildirimler',
    settings: 'Ayarlar',
    quit: 'Çıkış',
  },
  en: {
    show: 'Show',
    hide: 'Hide',
    newNote: 'New Note',
    quickNote: 'Quick Note',
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

// Show the window and tell the renderer which screen to open
function openInApp(channel) {
  const win = getMainWindow();
  if (!win) return;
  // Restored too when it was minimized ("Hide" minimizes it)
  showMainWindow();
  win.webContents.send(channel);
}

function hideMainWindow() {
  const win = getMainWindow();
  if (!win) return;
  if (win.isFullScreen()) win.setFullScreen(false);
  win.minimize();
}

function quit() {
  markQuitting();
  app.quit();
}

// Capnote's own menu (Windows): show or hide (whichever applies now), a new note, a quick note
// (with its shortcut when it is on), notifications, settings, quit
function showCustomMenu() {
  const labels = TRAY_LABELS[trayLanguage] || TRAY_LABELS.tr;
  const settings = readSettings() || {};
  const win = getMainWindow();
  const shown = !!win && win.isVisible() && !win.isMinimized();
  const items = [
    shown
      ? { id: 'hide', label: labels.hide, icon: 'far fa-eye-slash' }
      : { id: 'show', label: labels.show, icon: 'far fa-window-maximize' },
    { separator: true },
    { id: 'newNote', label: labels.newNote, icon: 'fas fa-plus' },
    {
      id: 'quickNote',
      label: labels.quickNote,
      icon: 'fas fa-bolt',
      hint: isQuickNoteShortcutOn() ? 'Ctrl+Alt+N' : '',
    },
    { id: 'notifications', label: labels.notifications, icon: 'far fa-bell' },
    { id: 'settings', label: labels.settings, icon: 'fas fa-gear' },
    { separator: true },
    { id: 'quit', label: labels.quit, icon: 'fas fa-power-off', danger: true },
  ];
  openTrayMenu(
    {
      theme: settings.darkMode ? 'dark' : 'light',
      accent: settings.accentColor || '',
      version: app.getVersion(),
      items,
    },
    {
      show: () => showMainWindow(),
      hide: hideMainWindow,
      newNote: () => openInApp('new-note'),
      quickNote: () => openQuickNote(),
      notifications: () => openInApp('open-notifications'),
      settings: () => openInApp('open-settings'),
      quit,
    }
  );
}

// Windows reports a right-click on the icon twice: when the button goes down and again when it
// comes up. The menu opens on the second, once the button is up: opened while it is still down,
// its release lands on the taskbar, which opens its own menu and takes the focus. When only one
// comes, the menu opens a moment later.
const SECOND_REPORT_MS = 350;
let rightClickTimer = null;
function onRightClick() {
  if (rightClickTimer) {
    clearTimeout(rightClickTimer);
    rightClickTimer = null;
    showCustomMenu();
    return;
  }
  rightClickTimer = setTimeout(() => {
    rightClickTimer = null;
    showCustomMenu();
  }, SECOND_REPORT_MS);
}

// The system's menu (macOS, Linux)
function updateTrayMenu() {
  if (!tray || customMenu) return;
  const labels = TRAY_LABELS[trayLanguage] || TRAY_LABELS.tr;
  const contextMenu = Menu.buildFromTemplate([
    { label: labels.show, click: () => showMainWindow() },
    { label: labels.hide, click: hideMainWindow },
    { type: 'separator' },
    { label: labels.newNote, click: () => openInApp('new-note') },
    { label: labels.notifications, click: () => openInApp('open-notifications') },
    { label: labels.settings, click: () => openInApp('open-settings') },
    { type: 'separator' },
    { label: labels.quit, click: quit },
  ]);
  tray.setContextMenu(contextMenu);
}

function createTray({ settings } = {}) {
  if (settings) readSettings = settings;
  try {
    const icon = resolveTrayIcon();
    if (!icon && process.platform !== 'win32') {
      console.warn('Tray icon asset not found; skipping tray on this platform');
      return;
    }
    tray = new Tray(icon || undefined);
    tray.setToolTip('Capnote');
    updateTrayMenu();
    if (customMenu) {
      tray.on('right-click', onRightClick);
      // Ready before the first right-click, without slowing the start
      setTimeout(prepareTrayMenu, 1500);
    }
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

// The renderer reports the UI language so the tray menu can follow it
function registerTrayIpc() {
  registerTrayMenuIpc();
  ipcMain.on('set-language', (event, lang) => {
    if (!TRAY_LABELS[lang]) return;
    trayLanguage = lang;
    updateTrayMenu();
  });
}

export { createTray, registerTrayIpc };
