/**
 * Electron Ana Süreci
 * Uygulamanın ana penceresini ve IPC iletişimini yönetir
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Veri deposu başlatma
const store = new Store();

let mainWindow;

/**
 * Ana pencereyi oluşturur ve yapılandırır
 */
function createWindow() {
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
