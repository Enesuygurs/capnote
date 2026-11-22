/**
 * Preload script of the tray menu window: the menu's items and theme come in; its height, the
 * chosen item and closing go out
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trayMenu', {
  onState: (callback) => ipcRenderer.on('tray-menu:state', (event, state) => callback(state)),
  size: (height) => ipcRenderer.send('tray-menu:size', height),
  run: (id) => ipcRenderer.send('tray-menu:run', id),
  activate: () => ipcRenderer.send('tray-menu:activate'),
  onShown: (callback) => ipcRenderer.on('tray-menu:shown', () => callback()),
  painted: () => ipcRenderer.send('tray-menu:painted'),
  close: () => ipcRenderer.send('tray-menu:close'),
});
