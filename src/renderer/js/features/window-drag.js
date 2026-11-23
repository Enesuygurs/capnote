// Moving the window by the empty space under the note list. A press and a move of a few pixels
// there moves the window (the main process follows the cursor); a press without moving is an
// ordinary click, so right-clicks and dropping notes stay as they are. Not from what is clicked
// or dragged there (note and folder rows, buttons).

const START_AFTER_PX = 4;

// What keeps its own mouse use
const OWN_MOUSE = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'img',
  'video',
  'audio',
  'iframe',
  'pre',
  'code',
  'table',
  '.checklist-item',
  '.note-link',
  '.chip',
  '.menu',
  '.context-menu',
  '.note-item',
  '.folder-item',
  '.nav-item',
  // A section's header opens and closes its list: a click there never moves the window
  '.nav-section-header',
  '[draggable="true"]',
  '[contenteditable="true"]',
].join(', ');

export class WindowDragFeature {
  // Where a press may move the window: the sidebar's list area, not its rows
  windowDragAllowed(e) {
    if (e.button !== 0 || e.target.closest(OWN_MOUSE)) return false;
    return !!this.sidebarContent?.contains(e.target);
  }

  setupWindowDrag() {
    const api = window.electronAPI?.windowDrag;
    this.sidebarContent = document.querySelector('.sidebar-content');
    if (!api || !this.sidebarContent) return;
    let press = null;
    let moving = false;
    const end = () => {
      if (moving) api.end();
      press = null;
      moving = false;
    };
    const onDown = (e) => {
      if (!this.windowDragAllowed(e)) return;
      press = { x: e.clientX, y: e.clientY, id: e.pointerId, target: e.target };
    };
    const onMove = (e) => {
      if (!press || moving || e.pointerId !== press.id) return;
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < START_AFTER_PX) return;
      moving = true;
      // The release comes back here even outside the window
      press.target.setPointerCapture?.(e.pointerId);
      window.getSelection()?.removeAllRanges();
      api.start();
    };
    this.sidebarContent.addEventListener('pointerdown', onDown);
    this.sidebarContent.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', end, true);
    document.addEventListener('pointercancel', end, true);
    window.addEventListener('blur', end);
  }
}
