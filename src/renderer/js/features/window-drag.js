// Moving the window by a note being read and by the empty space under the note list. A press and a
// move of a few pixels there moves the window (the main process follows the cursor); a press
// without moving is an ordinary click, so double-clicks, ticking tasks, scrolling and right-clicks
// stay as they are. Not from what is clicked or dragged there (links, tasks, buttons, images,
// code, note and folder rows), and never in the editor.

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
  '[draggable="true"]',
  '[contenteditable="true"]',
].join(', ');

export class WindowDragFeature {
  // Where a press may move the window: the note being read (not a locked note's page, not an
  // earlier version's comparison) and the sidebar's list area
  windowDragAllowed(e) {
    if (e.button !== 0 || e.target.closest(OWN_MOUSE)) return false;
    if (this.viewerContent?.contains(e.target)) {
      return this.isViewerOpen() && !e.target.closest('.locked-note-message');
    }
    return !!this.sidebarContent?.contains(e.target);
  }

  setupWindowDrag() {
    const api = window.electronAPI?.windowDrag;
    this.viewerContent = this.noteViewer?.querySelector('.viewer-content');
    this.sidebarContent = document.querySelector('.sidebar-content');
    if (!api || !this.viewerContent || !this.sidebarContent) return;
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
    [this.viewerContent, this.sidebarContent].forEach((area) => {
      area.addEventListener('pointerdown', onDown);
      area.addEventListener('pointermove', onMove);
    });
    document.addEventListener('pointerup', end, true);
    document.addEventListener('pointercancel', end, true);
    window.addEventListener('blur', end);
  }
}
