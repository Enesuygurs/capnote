// Starting Capnote when the user logs in (login items on Windows/macOS, a .desktop file on Linux)

const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');
const { ICONS_DIR } = require('./paths');

const usesLoginItems = process.platform === 'darwin' || process.platform === 'win32';

function linuxAutostartEntry() {
  return path.join(app.getPath('home'), '.config', 'autostart', 'capnote.desktop');
}

function writeLinuxAutostartEntry(entry) {
  fs.mkdirSync(path.dirname(entry), { recursive: true });
  const icon = ['capnote-32.png', 'capnote-16.png']
    .map((name) => path.join(ICONS_DIR, name))
    .find((file) => fs.existsSync(file));
  const lines = [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Capnote',
    `Exec=${app.getPath('exe')} %U`,
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

module.exports = { registerAutostartIpc };
