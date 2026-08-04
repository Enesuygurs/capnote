/**
 * Electron Ana Süreci
 * Uygulamanın ana penceresini ve IPC iletişimini yönetir
 */

const {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  Tray,
  Menu,
  nativeImage,
  dialog,
  shell,
  protocol,
  net,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL, fileURLToPath } = require('url');
const { JsonStore } = require('./main/storage');

// Files dropped into notes are referenced as capnote-file://upload/<name>, which keeps note content
// independent of where the user data folder lives (so backups work on another machine).
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'capnote-file',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

function uploadsDir() {
  return path.join(app.getPath('userData'), 'uploads');
}

// Resolve a capnote-file URL to a path inside the uploads folder (never outside of it)
function uploadPathFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'capnote-file:' || parsed.hostname !== 'upload') return null;
    const name = path.basename(decodeURIComponent(parsed.pathname));
    return name ? path.join(uploadsDir(), name) : null;
  } catch {
    return null;
  }
}

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

// Notes, folders, reminders, notifications and todos live in JSON files under userData
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

let mainWindow;
let tray = null;
let isQuitting = false;
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
// Close-to-tray is a Windows-only feature (the setting is only shown there)
const supportsCloseToTray = process.platform === 'win32';
let closeToTrayEnabled = supportsCloseToTray; // read from the settings file on startup

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
        try {
          img.setTemplateImage(true);
        } catch {}
        return img;
      }
    } else {
      // Linux: prefer 22-24px; resize from 32 if available
      if (fs.existsSync(png32))
        return nativeImage.createFromPath(png32).resize({ width: 22, height: 22 });
      if (fs.existsSync(png16)) return nativeImage.createFromPath(png16);
    }
  } catch {}
  return null;
}

function updateTrayMenu() {
  if (!tray) return;
  const labels = TRAY_LABELS[trayLanguage] || TRAY_LABELS.tr;
  const contextMenu = Menu.buildFromTemplate([
    {
      label: labels.show,
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: labels.hide,
      click: () => {
        if (mainWindow) {
          try {
            if (mainWindow.isFullScreen && mainWindow.isFullScreen()) {
              mainWindow.setFullScreen(false);
            }
          } catch {}
          mainWindow.minimize();
        }
      },
    },
    { type: 'separator' },
    {
      label: labels.newNote,
      click: () => {
        if (mainWindow && mainWindow.webContents) {
          mainWindow.show();
          mainWindow.webContents.send('new-note');
        }
      },
    },
    {
      label: labels.notifications,
      click: () => {
        if (mainWindow && mainWindow.webContents) {
          mainWindow.show();
          mainWindow.webContents.send('open-notifications');
        }
      },
    },
    {
      label: labels.settings,
      click: () => {
        if (mainWindow && mainWindow.webContents) {
          mainWindow.show();
          mainWindow.webContents.send('open-settings');
        }
      },
    },
    { type: 'separator' },
    {
      label: labels.quit,
      click: () => {
        isQuitting = true;
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
        try {
          tray.popUpContextMenu();
        } catch {}
        return;
      }
      if (!mainWindow) return;
      // Other platforms: toggle visibility on left-click for convenience
      if (mainWindow.isVisible()) mainWindow.hide();
      else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('Failed to create system tray:', err);
  }
}

// Uygulama hazır olduğunda pencereyi oluştur
app.whenReady().then(() => {
  protocol.handle('capnote-file', (request) => {
    const filePath = uploadPathFromUrl(request.url);
    if (!filePath || !fs.existsSync(filePath)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(filePath).href);
  });

  try {
    closeToTrayEnabled = supportsCloseToTray && readCloseToTrayPreference();
  } catch {}
  createWindow();
  createTray();
  // Menü kaldırıldı

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
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

// Largest file accepted into the uploads folder
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

// Copy a file dropped from the OS into app data/uploads and return its capnote-file URL.
// The path comes from the renderer, so only existing regular files of a sane size are accepted.
ipcMain.handle('save-dropped-file', (event, srcPath) => {
  try {
    if (!srcPath || typeof srcPath !== 'string' || !path.isAbsolute(srcPath)) return null;
    const stat = fs.statSync(srcPath);
    if (!stat.isFile() || stat.size > MAX_UPLOAD_BYTES) return null;

    fs.mkdirSync(uploadsDir(), { recursive: true });
    // Prefix with a timestamp and a random part to avoid collisions
    const targetName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${path.basename(srcPath)}`;
    fs.copyFileSync(srcPath, path.join(uploadsDir(), targetName));
    return `capnote-file://upload/${encodeURIComponent(targetName)}`;
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
            mainWindow.webContents.send(
              'native-notif-click',
              opts && opts.notificationId ? opts.notificationId : null
            );
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
      try {
        if (!fs.existsSync(autostartDir)) fs.mkdirSync(autostartDir, { recursive: true });
      } catch {}
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
        iconPath ? `Icon=${iconPath}` : '',
        'X-GNOME-Autostart-enabled=true',
        'NoDisplay=false',
        'Hidden=false',
        'Comment=Capnote',
      ].join('\n');
      fs.writeFileSync(entry, desktop.replace(/\n\n+/g, '\n'), { encoding: 'utf8' });
      return { ok: true };
    }
    if (fs.existsSync(entry)) {
      try {
        fs.unlinkSync(entry);
      } catch {}
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
});

// Close-to-tray preference
ipcMain.handle('get-close-to-tray', () => {
  try {
    closeToTrayEnabled = supportsCloseToTray && readCloseToTrayPreference();
  } catch {}
  return { enabled: !!closeToTrayEnabled };
});

ipcMain.handle('set-close-to-tray', (event, enabled) => {
  if (!supportsCloseToTray)
    return { ok: false, error: 'Close to tray is only supported on Windows' };
  // Persisted by the renderer together with the other settings
  closeToTrayEnabled = !!enabled;
  return { ok: true };
});

// Export a note to PDF with Chromium's own renderer (works offline, no third-party library).
// The renderer sends the note body; the document is assembled here around the bundled export styles.
ipcMain.handle('export-pdf', async (event, payload) => {
  const { title = 'note', bodyHtml = '', fileName = 'note.pdf' } = payload || {};
  if (typeof bodyHtml !== 'string') return { ok: false, error: 'Invalid content' };

  const parent = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(parent, {
    defaultPath: fileName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };

  const rendererDir = pathToFileURL(path.join(__dirname, 'renderer') + path.sep).href;
  const html = `<!doctype html><html><head><meta charset="utf-8"><base href="${rendererDir}">
<title>${String(title).replace(/[<>&"]/g, '')}</title>
<link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="export.css"></head>
<body>${bodyHtml}</body></html>`;

  const tmpFile = path.join(app.getPath('temp'), `capnote-export-${Date.now()}.html`);
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { javascript: false, sandbox: true },
  });
  try {
    fs.writeFileSync(tmpFile, html, 'utf8');
    await printWindow.loadFile(tmpFile);
    const pdf = await printWindow.webContents.printToPDF({ pageSize: 'A4', printBackground: true });
    fs.writeFileSync(filePath, pdf);
    return { ok: true, filePath };
  } catch (err) {
    console.error('PDF export failed:', err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  } finally {
    printWindow.destroy();
    fs.rmSync(tmpFile, { force: true });
  }
});

ipcMain.on('set-language', (event, lang) => {
  if (!TRAY_LABELS[lang]) return;
  trayLanguage = lang;
  updateTrayMenu();
});

ipcMain.handle('storage:load', () => {
  const storage = getDataStore();
  return { initialized: storage.isInitialized(), data: storage.readAll() };
});

ipcMain.handle('storage:save', (event, key, value) => {
  if (value === undefined) throw new Error('Refusing to store undefined');
  getDataStore().write(key, value);
  return true;
});

// Only plain file names inside the uploads folder are accepted from the renderer
function safeUploadName(name) {
  if (typeof name !== 'string') return null;
  const base = path.basename(name);
  return base && base === name && base !== '.' && base !== '..' ? base : null;
}

// Read upload files for a backup: { name: base64 }
ipcMain.handle('uploads:read', (event, names) => {
  const files = {};
  (Array.isArray(names) ? names : []).forEach((name) => {
    const safe = safeUploadName(name);
    const file = safe && path.join(uploadsDir(), safe);
    if (file && fs.existsSync(file)) files[safe] = fs.readFileSync(file).toString('base64');
  });
  return files;
});

// Restore upload files from a backup; existing files are left untouched
ipcMain.handle('uploads:write', (event, files) => {
  let written = 0;
  fs.mkdirSync(uploadsDir(), { recursive: true });
  Object.entries(files && typeof files === 'object' ? files : {}).forEach(([name, data]) => {
    const safe = safeUploadName(name);
    if (!safe || typeof data !== 'string') return;
    const file = path.join(uploadsDir(), safe);
    if (fs.existsSync(file)) return;
    const buffer = Buffer.from(data, 'base64');
    if (buffer.length > MAX_UPLOAD_BYTES) return;
    fs.writeFileSync(file, buffer);
    written++;
  });
  return written;
});

// Delete uploads that no note references. Recent files are kept because they may belong
// to a note that has not been saved yet.
const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;
ipcMain.handle('uploads:cleanup', (event, keepNames) => {
  const keep = new Set(Array.isArray(keepNames) ? keepNames : []);
  const dir = uploadsDir();
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  fs.readdirSync(dir).forEach((name) => {
    if (keep.has(name)) return;
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isFile() && Date.now() - stat.mtimeMs > ORPHAN_MIN_AGE_MS) {
      fs.rmSync(file, { force: true });
      removed++;
    }
  });
  return removed;
});
