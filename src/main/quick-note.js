// The quick note shortcut: Ctrl+Alt+N (Cmd+Alt+N on macOS) anywhere in the system brings Capnote
// forward on a new note, also when it runs in the tray. It can be turned off in the settings.

import { globalShortcut, ipcMain } from 'electron';
import { showMainWindow, getMainWindow } from './window.js';

const ACCELERATOR = 'CommandOrControl+Alt+N';

function openNewNote() {
  showMainWindow();
  getMainWindow()?.webContents.send('new-note');
}

// Turn the shortcut on or off. Registering fails when another app already uses the keys.
function setQuickNoteShortcut(enabled) {
  if (globalShortcut.isRegistered(ACCELERATOR)) globalShortcut.unregister(ACCELERATOR);
  if (!enabled) return { ok: true, enabled: false };
  const ok = globalShortcut.register(ACCELERATOR, openNewNote);
  return ok ? { ok: true, enabled: true } : { ok: false, error: 'in-use' };
}

function registerQuickNoteIpc() {
  ipcMain.handle('quick-note-shortcut:set', (event, enabled) => setQuickNoteShortcut(!!enabled));
  ipcMain.handle('quick-note-shortcut:get', () => ({
    enabled: globalShortcut.isRegistered(ACCELERATOR),
  }));
}

export { setQuickNoteShortcut, registerQuickNoteIpc };
