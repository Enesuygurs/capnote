/**
 * Electron Ana Süreci
 * Uygulamanın ana penceresini ve IPC iletişimini yönetir
 */

const { app, BrowserWindow, ipcMain, Notification } = require('electron');
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
    },
    titleBarStyle: 'hiddenInset',
    frame: false,
    show: false,
    vibrancy: 'under-window',
    transparent: false,
    icon: iconPath,
  });

  // HTML dosyasını yükle
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Pencere hazır olduğunda göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Geliştirme modunda DevTools'u aç
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Uygulama hazır olduğunda pencereyi oluştur
app.whenReady().then(() => {
  createWindow();
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
    // Some platforms require Notification.isSupported check
    if (Notification.isSupported && !Notification.isSupported()) {
      return false;
    }
    const notif = new Notification({
      title,
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
