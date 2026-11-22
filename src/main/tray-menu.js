// The tray icon's menu on Windows: the native menu cannot be styled, so it is a small see-through
// window drawn in the app's theme and accent. It opens at the mouse (above the taskbar, kept on
// the screen) and closes when it loses focus, on Escape, or once an item is chosen. The window is
// made once and kept hidden, so it opens at once.

import path from 'path';
import { BrowserWindow, ipcMain, screen } from 'electron';
import { RENDERER_DIR, TRAY_MENU_PRELOAD_FILE } from './paths.js';
import { lockDownNavigation } from './window.js';

// The menu is 200px wide; the window has 16px around it for the shadow
const MARGIN = 16;
const WIDTH = 200 + MARGIN * 2;

let menuWindow = null;
let loaded = null;
let handlers = {};
let point = null;

function createMenuWindow() {
  menuWindow = new BrowserWindow({
    width: WIDTH,
    height: 320,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    thickFrame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    title: 'Capnote',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: TRAY_MENU_PRELOAD_FILE,
      // Kept hidden between openings; it must still draw the items at once when it opens again
      backgroundThrottling: false,
    },
  });
  menuWindow.setAlwaysOnTop(true, 'pop-up-menu');
  lockDownNavigation(menuWindow);
  menuWindow.on('blur', hideTrayMenu);
  const win = menuWindow;
  win.on('closed', () => {
    if (menuWindow !== win) return;
    menuWindow = null;
    loaded = null;
  });
  loaded = menuWindow.loadFile(path.join(RENDERER_DIR, 'tray-menu.html'));
}

// state: { theme, accent, version, items: [{ id, label, icon, hint?, danger? } | { separator }] }
// actions: the function each item id runs
async function openTrayMenu(state, actions) {
  handlers = actions || {};
  point = screen.getCursorScreenPoint();
  if (!menuWindow) createMenuWindow();
  await loaded;
  menuWindow?.webContents.send('tray-menu:state', state);
}

function hideTrayMenu() {
  if (menuWindow && menuWindow.isVisible()) menuWindow.hide();
}

// Where the menu goes: its corner at the mouse, opening up and to the right, or to the left when
// that would leave the screen; always inside the work area (not over the taskbar)
function menuBounds(height) {
  const at = point || screen.getCursorScreenPoint();
  const area = screen.getDisplayNearestPoint(at).workArea;
  let x = at.x - MARGIN;
  if (x + WIDTH - MARGIN > area.x + area.width) x = at.x - WIDTH + MARGIN;
  let y = at.y - height + MARGIN;
  x = Math.min(Math.max(x, area.x - MARGIN), area.x + area.width - WIDTH + MARGIN);
  y = Math.min(Math.max(y, area.y - MARGIN), area.y + area.height - height + MARGIN);
  return { x: Math.round(x), y: Math.round(y), width: WIDTH, height };
}

function registerTrayMenuIpc() {
  const fromMenu = (event) => menuWindow && event.sender === menuWindow.webContents;

  // The page drew the items and says how tall it is: place the window and show it
  ipcMain.on('tray-menu:size', (event, height) => {
    if (!fromMenu(event)) return;
    const h = Math.min(Math.max(Math.round(Number(height) || 0), 60), 800);
    menuWindow.setBounds(menuBounds(h));
    menuWindow.show();
    menuWindow.focus();
  });

  ipcMain.on('tray-menu:run', (event, id) => {
    if (!fromMenu(event)) return;
    hideTrayMenu();
    const run = Object.hasOwn(handlers, id) ? handlers[id] : null;
    if (typeof run === 'function') run();
  });

  ipcMain.on('tray-menu:close', (event) => {
    if (fromMenu(event)) hideTrayMenu();
  });
}

export { openTrayMenu, hideTrayMenu, registerTrayMenuIpc };
