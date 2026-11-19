// Moving the window from places that must keep their clicks, scrolling and double-clicks (a note
// being read, the empty space under the note list), where a CSS drag area cannot be used: it takes
// every mouse event. The page says when a drag starts and ends; meanwhile the window follows the
// cursor. A maximized or full-screen window does not move.

import { BrowserWindow, ipcMain, screen } from 'electron';

const FOLLOW_EVERY_MS = 8;

export function registerWindowDragIpc() {
  let follow = null;
  const stop = () => {
    clearInterval(follow);
    follow = null;
  };
  ipcMain.on('window:drag-start', (event) => {
    stop();
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed() || win.isMaximized() || win.isFullScreen()) return;
    const start = screen.getCursorScreenPoint();
    const [x, y] = win.getPosition();
    // The size is set with the place: on a screen with another scale it must not change
    const [width, height] = win.getSize();
    follow = setInterval(() => {
      if (win.isDestroyed()) return stop();
      const now = screen.getCursorScreenPoint();
      win.setBounds({ x: x + now.x - start.x, y: y + now.y - start.y, width, height });
    }, FOLLOW_EVERY_MS);
  });
  ipcMain.on('window:drag-end', stop);
}
