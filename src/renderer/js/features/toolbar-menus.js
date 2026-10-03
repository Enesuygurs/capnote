// The formatting toolbar in one row: the rarer tools sit in small menus (font and size, colors,
// alignment, lists, insert) that open under their button. The tools inside are the usual ones
// with their own handlers; a menu only shows and hides them.

export class ToolbarMenusFeature {
  closeToolbarMenus(except = null) {
    document.querySelectorAll('.toolbar-menu').forEach((menu) => {
      if (menu === except) return;
      menu.classList.remove('open');
      menu.querySelector('.toolbar-popover').classList.add('hidden');
      menu.querySelector('.toolbar-menu-trigger').setAttribute('aria-expanded', 'false');
    });
  }

  toggleToolbarMenu(menu) {
    const popover = menu.querySelector('.toolbar-popover');
    const open = popover.classList.contains('hidden');
    this.closeToolbarMenus(menu);
    this.closeAllDropdowns?.();
    menu.classList.toggle('open', open);
    popover.classList.toggle('hidden', !open);
    menu.querySelector('.toolbar-menu-trigger').setAttribute('aria-expanded', String(open));
    if (!open) return;
    // Under the button, its right edge on the button's when it would leave the window
    popover.classList.remove('align-end');
    if (popover.getBoundingClientRect().right > window.innerWidth - 8) {
      popover.classList.add('align-end');
    }
  }

  // The alignment button shows the alignment in use
  syncAlignTrigger() {
    const icon = document.querySelector('#alignMenu .toolbar-menu-trigger i');
    if (!icon) return;
    const active = document.querySelector('#alignMenu .format-btn[data-align].active');
    icon.className = `fas fa-align-${active ? active.dataset.align : 'left'}`;
  }

  setupToolbarMenus() {
    document.querySelectorAll('.toolbar-menu').forEach((menu) => {
      const trigger = menu.querySelector('.toolbar-menu-trigger');
      const popover = menu.querySelector('.toolbar-popover');
      // The editor keeps its selection while a menu opens and a tool in it is used
      trigger.addEventListener('mousedown', (e) => {
        this.captureEditorSelection();
        e.preventDefault();
      });
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleToolbarMenu(menu);
      });
      popover.addEventListener('mousedown', (e) => {
        if (!e.target.closest('.format-btn')) return;
        this.captureEditorSelection();
        e.preventDefault();
      });
      // A tool runs (its own handler first), then the menu closes
      popover.addEventListener('click', (e) => {
        if (!e.target.closest('.format-btn')) return;
        this.closeToolbarMenus();
        setTimeout(() => this.syncAlignTrigger());
      });
    });
    // A click anywhere else closes them; inside a menu (a field, a color) it stays open
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.toolbar-popover')) this.closeToolbarMenus();
    });
    window.addEventListener('resize', () => this.closeToolbarMenus());
  }
}
