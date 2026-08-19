/**
 * Preload script: the only bridge between the page and the main process
 */

const { contextBridge, ipcRenderer, webUtils } = require('electron');

// Everything the page may call, exposed as window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // Tray menu actions. Callbacks get no arguments: the IPC event (and its sender) stays in the preload
  onNewNote: (callback) => ipcRenderer.on('new-note', () => callback()),
  onOpenNotifications: (callback) => ipcRenderer.on('open-notifications', () => callback()),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', () => callback()),
  // Expose platform string for renderer UI decisions (darwin, win32, linux)
  platform: process.platform,

  // Custom titlebar buttons
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),

  // App data persisted by the main process (one JSON file per collection)
  storage: {
    load: () => ipcRenderer.invoke('storage:load'),
    save: (key, value) => ipcRenderer.invoke('storage:save', key, value),
  },
  // Files in the uploads folder: read/write for backups, cleanup of files no note uses
  uploads: {
    read: (names) => ipcRenderer.invoke('uploads:read', names),
    write: (files) => ipcRenderer.invoke('uploads:write', files),
    cleanup: (keepNames) => ipcRenderer.invoke('uploads:cleanup', keepNames),
  },
  // Copy a file the user dropped or picked (a DOM File) into the app uploads folder
  saveDroppedFile: (file) => ipcRenderer.invoke('save-dropped-file', webUtils.getPathForFile(file)),
  // Export a note body to PDF (main process shows the save dialog)
  exportPdf: (payload) => ipcRenderer.invoke('export-pdf', payload),
  // Native OS notifications via main process
  showNativeNotification: (opts) => ipcRenderer.invoke('show-native-notification', opts),
  // Listen for native notification clicks forwarded from main
  onNativeNotificationClick: (callback) =>
    ipcRenderer.on('native-notif-click', (event, notificationId) => callback(notificationId)),
  // Autostart (start at login)
  getStartAtLogin: () => ipcRenderer.invoke('get-start-at-login'),
  setStartAtLogin: (enabled) => ipcRenderer.invoke('set-start-at-login', enabled),
  // Keep main-process UI (tray menu) in the app language
  setLanguage: (lang) => ipcRenderer.send('set-language', lang),
  // Close-to-tray preference
  getCloseToTray: () => ipcRenderer.invoke('get-close-to-tray'),
  setCloseToTray: (enabled) => ipcRenderer.invoke('set-close-to-tray', enabled),
});
