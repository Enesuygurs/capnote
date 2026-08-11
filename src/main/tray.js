// System tray icon and its menu

const fs = require('fs');
const path = require('path');
const { app, Tray, Menu, nativeImage, ipcMain } = require('electron');
const { ICONS_DIR } = require('./paths');
const { getMainWindow, showMainWindow, markQuitting } = require('./window');

let tray = null;
let trayLanguage = 'tr';

// Tray menu labels; the renderer reports the selected UI language
const TRAY_LABELS = {
  tr: {
    show: 'Göster',
    hide: 'Gizle',
    newNote: 'Yeni Not',
    notifications: 'Bildirimler',
    settings: 'Ayarlar',
    quit: 'Çıkış',
  },
  en: {
    show: 'Show',
    hide: 'Hide',
    newNote: 'New Note',
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
    // macOS: status bar icon looks best around 18x18pt. Use template for auto light/dark.
    let base = null;
    if (fs.existsSync(png16)) base = nativeImage.createFromPath(png16);
    else if (fs.existsSync(png32)) base = nativeImage.createFromPath(png32);
    if (base) {
      const img = base.resize({ width: 18, height: 18, quality: 'best' });
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
  win.show();
  win.webContents.send(channel);
}

function updateTrayMenu() {
  if (!tray) return;
  const labels = TRAY_LABELS[trayLanguage] || TRAY_LABELS.tr;
  const contextMenu = Menu.buildFromTemplate([
    { label: labels.show, click: () => showMainWindow() },
    {
      label: labels.hide,
      click: () => {
        const win = getMainWindow();
        if (!win) return;
        if (win.isFullScreen()) win.setFullScreen(false);
        win.minimize();
      },
    },
    { type: 'separator' },
    { label: labels.newNote, click: () => openInApp('new-note') },
    { label: labels.notifications, click: () => openInApp('open-notifications') },
    { label: labels.settings, click: () => openInApp('open-settings') },
    { type: 'separator' },
    {
      label: labels.quit,
      click: () => {
        markQuitting();
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

function createTray() {
  try {
    const icon = resolveTrayIcon();
    if (!icon && process.platform !== 'win32') {
      console.warn('Tray icon asset not found; skipping tray on this platform');
      return;
    }
    tray = new Tray(icon || undefined);
    tray.setToolTip('Capnote');
    updateTrayMenu();
    tray.on('click', () => {
      if (process.platform === 'darwin') {
        // macOS: Don't auto-show the window on click; show the tray menu instead
        tray.popUpContextMenu();
        return;
      }
      const win = getMainWindow();
      if (!win) return;
      // Other platforms: toggle visibility on left-click for convenience
      if (win.isVisible()) win.hide();
      else showMainWindow();
    });
  } catch (err) {
    console.warn('Failed to create system tray:', err);
  }
}

// The renderer reports the UI language so the tray menu can follow it
function registerTrayIpc() {
  ipcMain.on('set-language', (event, lang) => {
    if (!TRAY_LABELS[lang]) return;
    trayLanguage = lang;
    updateTrayMenu();
  });
}

module.exports = { createTray, registerTrayIpc };
