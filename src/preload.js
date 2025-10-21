/**
 * Electron Preload Scripti
 * Ana süreç ile renderer süreci arasında güvenli IPC köprüsü sağlar
 */

const { contextBridge, ipcRenderer } = require('electron');

// Ana süreç ile renderer süreci arasında güvenli köprü
contextBridge.exposeInMainWorld('electronAPI', {
  // Not işlemleri
  getNotes: () => ipcRenderer.invoke('get-notes'),
  saveNote: (note) => ipcRenderer.invoke('save-note', note),
  deleteNote: (noteId) => ipcRenderer.invoke('delete-note', noteId),
  updateNote: (note) => ipcRenderer.invoke('update-note', note),

  // Menü olayları
  onNewNote: (callback) => ipcRenderer.on('new-note', callback),

  // Pencere kontrolleri
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),

  // Cleanup
  removeAllListeners: () => ipcRenderer.removeAllListeners(),
  // Save a file dropped from the OS into the app uploads folder. Pass the source path (from DataTransfer.files)
  saveDroppedFile: (srcPath) => ipcRenderer.invoke('save-dropped-file', srcPath),
  // Native OS notifications via main process
  showNativeNotification: (opts) => ipcRenderer.invoke('show-native-notification', opts),
  // Listen for native notification clicks forwarded from main
  onNativeNotificationClick: (callback) => ipcRenderer.on('native-notif-click', (event, notificationId) => callback(notificationId)),
  // Autostart / tray helpers
  getStartAtLogin: () => ipcRenderer.invoke('get-start-at-login'),
  setStartAtLogin: (enabled) => ipcRenderer.invoke('set-start-at-login', enabled),
  showFromTray: () => ipcRenderer.send('show-from-tray'),
});
