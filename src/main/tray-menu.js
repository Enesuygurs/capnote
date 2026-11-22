// The tray icon's menu on Windows: the native menu cannot be styled, so it is a small see-through
// window drawn in the app's theme and accent. It opens at the mouse (above the taskbar, kept on
// the screen) and closes when it loses focus, on Escape, or once an item is chosen. The window is
// drawn once, unseen, a moment after the tray icon and then kept hidden, so it opens at once.

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
// Windows reports the right-click when the button goes down. The menu shows at once but takes the
// focus only after the button is up (the mouse leaves the icon or comes onto the menu, or at the
// latest this long after): taking it while the button is down closes the hidden icons panel, and
// the button's release then lands on the taskbar, which opens its own menu.
const ACTIVATE_AFTER_MS = 600;
let activateTimer = null;
// A window shown again first shows what it showed when it was hidden; the menu is shown see-through
// and made visible once the page has drawn the new items (or after this long at the latest)
const REVEAL_AFTER_MS = 200;
// ...and not sooner than this after it was shown, so the new frame is on the screen
const REVEAL_NOT_BEFORE_MS = 50;
let revealTimer = null;
let shownAt = 0;
// Drawing the menu once, unseen, at the start: the first right-click then opens it at once
let warming = false;

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
  menuWindow.on('blur', onBlur);
  const win = menuWindow;
  win.on('closed', () => {
    if (menuWindow !== win) return;
    menuWindow = null;
    loaded = null;
  });
  loaded = menuWindow.loadFile(path.join(RENDERER_DIR, 'tray-menu.html'));
}

// Losing the focus closes the menu (a click outside it). A right-click on the icon while the menu
// is open closes it too, as the system's menu does: pressing the button takes the focus first,
// then the right-click comes, which must not open the menu again.
let closedByBlurAt = 0;
const SAME_CLICK_MS = 300;
function onBlur() {
  if (!menuWindow?.isVisible()) return;
  closedByBlurAt = Date.now();
  hideTrayMenu();
}

// The menu takes the focus (keys work and a click outside closes it)
function activateTrayMenu() {
  clearTimeout(activateTimer);
  activateTimer = null;
  if (menuWindow?.isVisible() && !menuWindow.isFocused()) menuWindow.focus();
}

// state: { theme, accent, version, items: [{ id, label, icon, hint?, danger? } | { separator }] }
// actions: the function each item id runs
// warm: draw it once without showing it (at the start), so the first right-click opens it at once
async function openTrayMenu(state, actions, { warm = false } = {}) {
  if (!warm && Date.now() - closedByBlurAt < SAME_CLICK_MS) return;
  warming = warm;
  if (!warm) handlers = actions || {};
  point = screen.getCursorScreenPoint();
  if (!menuWindow) createMenuWindow();
  await loaded;
  menuWindow?.webContents.send('tray-menu:state', state);
}

// The page has drawn the new items: the menu becomes visible (one drawn only to warm up is hidden)
function revealTrayMenu() {
  clearTimeout(revealTimer);
  revealTimer = null;
  if (!menuWindow?.isVisible()) return;
  if (warming) {
    warming = false;
    menuWindow.hide();
    return;
  }
  menuWindow.setOpacity(1);
}

function hideTrayMenu() {
  clearTimeout(activateTimer);
  activateTimer = null;
  clearTimeout(revealTimer);
  revealTimer = null;
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
    // See-through until the page has drawn the new items: what it showed last time never shows
    menuWindow.setOpacity(0);
    menuWindow.setBounds(menuBounds(h));
    // Shown without the focus; it takes it once the button is up
    menuWindow.showInactive();
    shownAt = Date.now();
    menuWindow.webContents.send('tray-menu:shown');
    clearTimeout(revealTimer);
    revealTimer = setTimeout(revealTrayMenu, REVEAL_AFTER_MS);
    if (warming) return;
    clearTimeout(activateTimer);
    activateTimer = setTimeout(activateTrayMenu, ACTIVATE_AFTER_MS);
  });

  ipcMain.on('tray-menu:painted', (event) => {
    if (!fromMenu(event)) return;
    const early = REVEAL_NOT_BEFORE_MS - (Date.now() - shownAt);
    if (early <= 0) {
      revealTrayMenu();
      return;
    }
    clearTimeout(revealTimer);
    revealTimer = setTimeout(revealTrayMenu, early);
  });

  ipcMain.on('tray-menu:run', (event, id) => {
    if (!fromMenu(event)) return;
    hideTrayMenu();
    const run = Object.hasOwn(handlers, id) ? handlers[id] : null;
    if (typeof run === 'function') run();
  });

  // The mouse came onto the menu: the button is up
  ipcMain.on('tray-menu:activate', (event) => {
    if (fromMenu(event)) activateTrayMenu();
  });

  ipcMain.on('tray-menu:close', (event) => {
    if (fromMenu(event)) hideTrayMenu();
  });
}

export { openTrayMenu, hideTrayMenu, activateTrayMenu, registerTrayMenuIpc };
