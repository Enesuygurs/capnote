// Starting Capnote when the user logs in (login items on Windows/macOS, a .desktop file on Linux)

import fs from 'fs';
import path from 'path';
import { app, ipcMain } from 'electron';
import { ICONS_DIR } from './paths.js';

const usesLoginItems = process.platform === 'darwin' || process.platform === 'win32';

function linuxAutostartEntry() {
  return path.join(app.getPath('home'), '.config', 'autostart', 'capnote.desktop');
}

// Desktop entry arguments are double-quoted, with \ " ` and $ escaped
const quoteArg = (arg) => `"${String(arg).replace(/[\\"`$]/g, '\\$&')}"`;

// The command that starts this copy of Capnote: an AppImage runs from a temporary mount, so its
// own file is used instead; a source checkout needs Electron plus the app folder.
function launchCommand() {
  if (process.env.APPIMAGE) return quoteArg(process.env.APPIMAGE);
  if (!app.isPackaged) return `${quoteArg(process.execPath)} ${quoteArg(app.getAppPath())}`;
  return quoteArg(app.getPath('exe'));
}

// The bundled icon may sit inside app.asar, which the desktop cannot read; keep a copy in userData
function desktopIconPath() {
  try {
    const target = path.join(app.getPath('userData'), 'capnote.png');
    fs.copyFileSync(path.join(ICONS_DIR, 'capnote-512.png'), target);
    return target;
  } catch {
    return null;
  }
}

function writeLinuxAutostartEntry(entry) {
  fs.mkdirSync(path.dirname(entry), { recursive: true });
  const icon = desktopIconPath();
  const lines = [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Capnote',
    `Exec=${launchCommand()}`,
    icon ? `Icon=${icon}` : null,
    'X-GNOME-Autostart-enabled=true',
    'NoDisplay=false',
    'Hidden=false',
    'Comment=Capnote',
  ];
  fs.writeFileSync(entry, lines.filter(Boolean).join('\n'), { encoding: 'utf8' });
}

function registerAutostartIpc() {
  ipcMain.handle('get-start-at-login', () => {
    try {
      if (usesLoginItems) return { enabled: !!app.getLoginItemSettings().openAtLogin };
      return { enabled: fs.existsSync(linuxAutostartEntry()) };
    } catch {
      return { enabled: false };
    }
  });

  ipcMain.handle('set-start-at-login', (event, enabled) => {
    try {
      const openAtLogin = !!enabled;
      if (usesLoginItems) {
        app.setLoginItemSettings({ openAtLogin, openAsHidden: true });
        return { ok: true };
      }
      const entry = linuxAutostartEntry();
      if (openAtLogin) writeLinuxAutostartEntry(entry);
      else fs.rmSync(entry, { force: true });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  });
}

export { registerAutostartIpc };
