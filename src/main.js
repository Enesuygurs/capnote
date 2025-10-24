/**
 * Electron Ana Süreci
 * Uygulamanın ana penceresini ve IPC iletişimini yönetir
 */

const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Enable hot reload in development using electron-reloader
try {
  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV !== 'production';
  if (isDev) {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    require('electron-reloader')(module, {
      watchRenderer: true,
      debug: false,
    });
    console.log('Electron reloader enabled (dev mode)');
  }
} catch (err) {
  // If electron-reloader isn't installed, ignore silently in production or CI
}

// Veri deposu başlatma
const store = new Store();

let mainWindow;
let tray = null;
let isQuitting = false;
let closeToTrayEnabled = true; // persisted in store

// Ensure the app name is set so native notifications and system UI show 'Capnote'
try {
  // On Windows, AppUserModelID affects which app name/icon appears in notifications
  if (app && typeof app.setAppUserModelId === 'function') {
    app.setAppUserModelId('Capnote');
  }
  // Also set a friendly name for macOS/other platforms
  if (app) app.name = 'Capnote';
} catch (e) {
  // ignore if setting fails
}

/**
 * Ana pencereyi oluşturur ve yapılandırır
 */
function createWindow() {
  // Determine icon path (prefer .ico on Windows if available)
  const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
  let iconPath = path.join(iconsDir, 'capnote-512.png');
  if (process.platform === 'win32') {
    const icoPath = path.join(iconsDir, 'capnote.ico');
    if (fs.existsSync(icoPath)) {
      iconPath = icoPath;
    }
  }

  // Ana pencereyi oluştur
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableBlinkFeatures: 'OverlayScrollbars',
      offscreen: false,
      hardwareAcceleration: true,
    },
    titleBarStyle: 'hiddenInset',
    frame: false,
    show: false,
    vibrancy: 'under-window',
    transparent: false,
    icon: iconPath,
    backgroundColor: '#ffffff',
    // Improve resize performance
    useContentSize: false,
  });

  // HTML dosyasını yükle
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Pencere hazır olduğunda göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Intercept close to support close-to-tray behavior
  mainWindow.on('close', (e) => {
    try {
      if (!isQuitting && closeToTrayEnabled) {
        e.preventDefault();
        mainWindow.hide();
        return false;
      }
    } catch {}
    return undefined;
  });

  // Geliştirme modunda DevTools'u aç
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function resolveTrayIcon() {
  try {
    const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
    const png16 = path.join(iconsDir, 'capnote-16.png');
    const png32 = path.join(iconsDir, 'capnote-32.png');

    if (process.platform === 'win32') {
      const ico = path.join(iconsDir, 'capnote.ico');
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
        try { img.setTemplateImage(true); } catch {}
        return img;
      }
    } else {
      // Linux: prefer 22-24px; resize from 32 if available
      if (fs.existsSync(png32)) return nativeImage.createFromPath(png32).resize({ width: 22, height: 22 });
      if (fs.existsSync(png16)) return nativeImage.createFromPath(png16);
    }
  } catch {}
  return null;
}

function createTray() {
  try {
    const icon = resolveTrayIcon();
    if (!icon && process.platform !== 'win32') {
      console.warn('Tray icon asset not found; skipping tray on this platform');
      return;
    }
    tray = new Tray(icon || undefined);
    try {
      const sizeDesc = icon ? `${icon.getSize().width}x${icon.getSize().height}` : 'undefined';
      console.log(`[tray] created for platform=${process.platform}, icon size=${sizeDesc}`);
    } catch {}
    tray.setToolTip('Capnote');
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Göster', click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
        }
      } },
      { label: 'Gizle', click: () => {
        if (mainWindow) {
          try {
            if (mainWindow.isFullScreen && mainWindow.isFullScreen()) {
              mainWindow.setFullScreen(false);
            }
          } catch {}
          mainWindow.minimize();
        }
      } },
      { type: 'separator' },
      { label: 'Yeni Not', click: () => { if (mainWindow && mainWindow.webContents) { mainWindow.show(); mainWindow.webContents.send('new-note'); } } },
      { label: 'Bildirimler', click: () => { if (mainWindow && mainWindow.webContents) { mainWindow.show(); mainWindow.webContents.send('open-notifications'); } } },
      { label: 'Ayarlar', click: () => { if (mainWindow && mainWindow.webContents) { mainWindow.show(); mainWindow.webContents.send('open-settings'); } } },
      { type: 'separator' },
      { label: 'Çıkış', click: () => { isQuitting = true; app.quit(); } },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (process.platform === 'darwin') {
        // macOS: Don't auto-show the window on click; show the tray menu instead
        try { tray.popUpContextMenu(); } catch {}
        return;
      }
      if (!mainWindow) return;
      // Other platforms: toggle visibility on left-click for convenience
      if (mainWindow.isVisible()) mainWindow.hide();
      else { mainWindow.show(); mainWindow.focus(); }
    });
  } catch (err) {
    console.warn('Failed to create system tray:', err);
  }
}

// Uygulama hazır olduğunda pencereyi oluştur
app.whenReady().then(() => {
  try { closeToTrayEnabled = store.get('settings.closeToTray', true); } catch {}
  createWindow();
  createTray();
  // Menü kaldırıldı

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Tüm pencereler kapatıldığında uygulamayı sonlandır (macOS hariç)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// IPC işleyicileri
ipcMain.handle('get-notes', () => {
  return store.get('notes', []);
});

ipcMain.handle('save-note', (event, note) => {
  const notes = store.get('notes', []);
  note.id = Date.now().toString();
  note.createdAt = new Date().toISOString();
  notes.unshift(note);
  store.set('notes', notes);
  return note;
});

ipcMain.handle('delete-note', (event, noteId) => {
  const notes = store.get('notes', []);
  const filteredNotes = notes.filter((note) => note.id !== noteId);
  store.set('notes', filteredNotes);
  return true;
});

ipcMain.handle('update-note', (event, updatedNote) => {
  const notes = store.get('notes', []);
  const noteIndex = notes.findIndex((note) => note.id === updatedNote.id);
  if (noteIndex !== -1) {
    notes[noteIndex] = { ...notes[noteIndex], ...updatedNote };
    store.set('notes', notes);
    return notes[noteIndex];
  }
  return null;
});

// Pencere kontrolleri
ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// Save file dropped from OS to app data/uploads and return a file:// path for renderer
ipcMain.handle('save-dropped-file', (event, srcPath) => {
  try {
    if (!srcPath || typeof srcPath !== 'string') return null;
    const uploadsDir = path.join(app.getPath('userData'), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const baseName = path.basename(srcPath);
    // create a timestamped filename to avoid collisions
    const targetName = `${Date.now()}-${baseName}`;
    const destPath = path.join(uploadsDir, targetName);
    fs.copyFileSync(srcPath, destPath);
    // return a file:// URI so the renderer can load it in <img src=>
    return `file://${destPath}`;
  } catch (err) {
    console.error('Failed to save dropped file:', err);
    return null;
  }
});

// Native notification helper (works on Windows / macOS / Linux where supported)
ipcMain.handle('show-native-notification', (event, opts) => {
  try {
    // opts: { title, body, silent, icon }
  const { title = '', body = '', silent = false, icon } = opts || {};
  // Use app name as default title when not provided to avoid showing internal identifiers
  const notifTitle = title && title.length ? title : 'Capnote';
    // Some platforms require Notification.isSupported check
    if (Notification.isSupported && !Notification.isSupported()) {
      return false;
    }
    const notif = new Notification({
      title: notifTitle,
      body,
      silent,
      icon: icon || undefined,
    });
    notif.show();
    // Forward click events to renderer so the app can react (mark as read / open notifications)
    try {
      notif.on('click', () => {
        if (mainWindow && mainWindow.webContents) {
          try {
            // Send the notificationId back if provided in opts
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('native-notif-click', opts && opts.notificationId ? opts.notificationId : null);
          } catch (e) {
            console.warn('Failed to send native-notif-click to renderer', e);
          }
        }
      });
    } catch (e) {
      // Some platforms may not support click events; ignore
    }
    return true;
  } catch (err) {
    console.error('Failed to show native notification', err);
    return false;
  }
});

// Start at login (autostart) handlers
ipcMain.handle('get-start-at-login', () => {
  try {
    if (process.platform === 'darwin' || process.platform === 'win32') {
      const st = app.getLoginItemSettings();
      return { enabled: !!st.openAtLogin };
    }
    const home = app.getPath('home');
    const autostartDir = path.join(home, '.config', 'autostart');
    const entry = path.join(autostartDir, 'capnote.desktop');
    return { enabled: fs.existsSync(entry) };
  } catch (e) {
    return { enabled: false };
  }
});

ipcMain.handle('set-start-at-login', (event, enabled) => {
  try {
    const openAtLogin = !!enabled;
    if (process.platform === 'darwin' || process.platform === 'win32') {
      app.setLoginItemSettings({ openAtLogin, openAsHidden: true });
      return { ok: true };
    }
    const home = app.getPath('home');
    const autostartDir = path.join(home, '.config', 'autostart');
    const entry = path.join(autostartDir, 'capnote.desktop');
    if (openAtLogin) {
      try { if (!fs.existsSync(autostartDir)) fs.mkdirSync(autostartDir, { recursive: true }); } catch {}
      const execPath = app.getPath('exe');
      // Try to set an icon path for the desktop entry (best-effort)
      let iconPath = '';
      try {
        const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
        const icon32 = path.join(iconsDir, 'capnote-32.png');
        const icon16 = path.join(iconsDir, 'capnote-16.png');
        if (fs.existsSync(icon32)) iconPath = icon32;
        else if (fs.existsSync(icon16)) iconPath = icon16;
      } catch {}
      const desktop = [
        '[Desktop Entry]',
        'Type=Application',
        'Name=Capnote',
        `Exec=${execPath} %U`,
        (iconPath ? `Icon=${iconPath}` : ''),
        'X-GNOME-Autostart-enabled=true',
        'NoDisplay=false',
        'Hidden=false',
        'Comment=Capnote',
      ].join('\n');
      fs.writeFileSync(entry, desktop.replace(/\n\n+/g, '\n'), { encoding: 'utf8' });
      return { ok: true };
    }
    if (fs.existsSync(entry)) { try { fs.unlinkSync(entry); } catch {} }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
});

// Close-to-tray preference (persist in store)
ipcMain.handle('get-close-to-tray', () => {
  try { closeToTrayEnabled = store.get('settings.closeToTray', true); } catch {}
  return { enabled: !!closeToTrayEnabled };
});

ipcMain.handle('set-close-to-tray', (event, enabled) => {
  closeToTrayEnabled = !!enabled;
  try { store.set('settings.closeToTray', closeToTrayEnabled); } catch {}
  return { ok: true };
});
