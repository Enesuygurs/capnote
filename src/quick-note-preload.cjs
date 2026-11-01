/**
 * Preload script of the quick note window: saving the note (the main window keeps it), opening it
 * in the app, and closing the window
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('quickNote', {
  save: (note) => ipcRenderer.invoke('quick-note:save', note),
  expand: (note) => ipcRenderer.invoke('quick-note:expand', note),
  close: () => ipcRenderer.send('quick-note:close'),
  platform: process.platform,
});
