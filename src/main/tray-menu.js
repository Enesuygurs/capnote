// The tray icon's menu on Windows: the native menu cannot be styled, so it is a small see-through
// window drawn in the app's theme and accent. It opens at the mouse (above the taskbar, kept on
// the screen) and closes when it loses focus, on Escape, or once an item is chosen.
//
// Showing a window makes Windows play its opening animation (a fade of about 200ms), and a frame
// of the menu can come before the fade starts: the menu flashed, then faded in ("it opens, closes
// and opens again"), and it seemed slow. So the menu is never shown on the screen: while closed,
// the window waits shown off the screen (without the focus, letting clicks through, out of
// Alt+Tab), and opening it moves it to the mouse, which plays no animation. Closing hides it (so
// the focus goes back where it was) and puts it back off the screen at once.
//
// The page draws the menu empty before the window is hidden or moved away and fills it only once
// it is in place, so no old picture of it ever shows. The window's opacity is never used: with
// drawing in software (the hardware acceleration setting off) it leaves a see-through window
// invisible for good.

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
// Open on the screen (the window itself is always shown, off the screen while closed)
let open = false;
// Windows reports the right-click when the button goes down. The menu shows at once but takes the
// focus only after the button is up (the mouse leaves the icon or comes onto the menu, or at the
// latest this long after): taking it while the button is down closes the hidden icons panel, and
// the button's release then lands on the taskbar, which opens its own menu.
const ACTIVATE_AFTER_MS = 600;
let activateTimer = null;
// Closing waits for the page to have drawn the menu empty, this long at the most
const CLOSE_AFTER_MS = 150;
let closeTimer = null;
let closing = false;

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
    // A tool window: never in Alt+Tab, also while it waits off the screen
    type: 'toolbar',
    show: false,
    title: 'Capnote',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: TRAY_MENU_PRELOAD_FILE,
      // It must draw the items at once when it opens
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
    open = false;
  });
  loaded = menuWindow.loadFile(path.join(RENDERER_DIR, 'tray-menu.html')).then(() => park());
}

// Off every screen: left of the leftmost display
function offScreenBounds() {
  const left = Math.min(...screen.getAllDisplays().map((d) => d.bounds.x));
  const top = Math.min(...screen.getAllDisplays().map((d) => d.bounds.y));
  const { height } = menuWindow.getBounds();
  return { x: left - WIDTH - 2000, y: top, width: WIDTH, height };
}

// The window waits shown off the screen, without the focus, letting clicks through
function park() {
  if (!menuWindow) return;
  menuWindow.setIgnoreMouseEvents(true);
  menuWindow.setBounds(offScreenBounds());
  if (!menuWindow.isVisible()) menuWindow.showInactive();
}

// Losing the focus closes the menu (a click outside it). A right-click on the icon while the menu
// is open closes it too, as the system's menu does: pressing the button takes the focus first,
// then the right-click comes, which must not open the menu again.
let closedByBlurAt = 0;
const SAME_CLICK_MS = 300;
function onBlur() {
  if (!open || closing) return;
  closedByBlurAt = Date.now();
  hideTrayMenu();
}

// The menu takes the focus (keys work and a click outside closes it)
function activateTrayMenu() {
  clearTimeout(activateTimer);
  activateTimer = null;
  if (open && !closing && menuWindow && !menuWindow.isFocused()) menuWindow.focus();
}

// state: { theme, accent, version, items: [{ id, label, icon, hint?, danger? } | { separator }] }
// actions: the function each item id runs
// warm: only make the window and draw it (at the start), so the first right-click opens it at once
async function openTrayMenu(state, actions, { warm = false } = {}) {
  if (!warm && Date.now() - closedByBlurAt < SAME_CLICK_MS) return;
  if (!warm) handlers = actions || {};
  point = screen.getCursorScreenPoint();
  if (!menuWindow) createMenuWindow();
  await loaded;
  if (warm) return;
  menuWindow?.webContents.send('tray-menu:state', state);
}

// Closing: the page empties the menu and says when it is drawn empty; then the window is hidden
// (the focus goes back) and waits off the screen again
function hideTrayMenu() {
  clearTimeout(activateTimer);
  activateTimer = null;
  if (!menuWindow || !open || closing) return;
  closing = true;
  menuWindow.setIgnoreMouseEvents(true);
  menuWindow.webContents.send('tray-menu:hiding');
  closeTimer = setTimeout(finishClosing, CLOSE_AFTER_MS);
}

function finishClosing() {
  clearTimeout(closeTimer);
  closeTimer = null;
  closing = false;
  open = false;
  if (!menuWindow) return;
  menuWindow.hide();
  park();
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

  // The page drew the items (still empty on the screen) and says how tall it is: the window moves
  // to the mouse and the page fills it
  ipcMain.on('tray-menu:size', (event, height) => {
    if (!fromMenu(event)) return;
    // Opened again while it was closing: it stays
    if (closing) {
      clearTimeout(closeTimer);
      closeTimer = null;
      closing = false;
    }
    const h = Math.min(Math.max(Math.round(Number(height) || 0), 60), 800);
    menuWindow.setBounds(menuBounds(h));
    // Shown off the screen already: moving it plays no animation. Without the focus; it takes it
    // once the button is up.
    if (!menuWindow.isVisible()) menuWindow.showInactive();
    menuWindow.setIgnoreMouseEvents(false);
    open = true;
    menuWindow.webContents.send('tray-menu:shown');
    clearTimeout(activateTimer);
    activateTimer = setTimeout(activateTrayMenu, ACTIVATE_AFTER_MS);
  });

  // The page has drawn the menu empty: the window can go
  ipcMain.on('tray-menu:hidden', (event) => {
    if (fromMenu(event) && closing) finishClosing();
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
