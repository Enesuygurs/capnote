// Away from the computer: how long the system has had no keyboard or mouse input, and a signal
// when the screen locks or the computer sleeps. The page locks opened locked notes with them.

import { ipcMain, powerMonitor } from 'electron';
import { getMainWindow } from './window.js';

export function registerIdleIpc() {
  ipcMain.handle('system:idle-seconds', () => powerMonitor.getSystemIdleTime());
  const away = () => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.webContents.send('system:away');
  };
  powerMonitor.on('lock-screen', away);
  powerMonitor.on('suspend', away);
}
