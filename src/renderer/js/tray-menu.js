// The tray icon's menu (Windows): the items, theme and accent come from the main process each time
// it opens. A click or Enter runs an item; the arrow keys move between items; Escape closes it.

const api = window.trayMenu;
const root = document.documentElement;
const menu = document.getElementById('trayMenu');
const list = document.getElementById('trayMenuItems');
const version = document.getElementById('trayMenuVersion');
// The space around the menu in the window (the page's padding), for its shadow
const SHADOW_MARGIN = 16;

function render(state) {
  root.dataset.theme = state.theme === 'dark' ? 'dark' : 'light';
  if (/^#[0-9a-f]{6}$/i.test(state.accent || '')) {
    root.style.setProperty('--accent-color', state.accent);
  } else {
    root.style.removeProperty('--accent-color');
  }
  version.textContent = state.version ? `v${state.version}` : '';
  list.replaceChildren(
    ...state.items.map((item) => {
      if (item.separator) {
        const line = document.createElement('div');
        line.className = 'tray-menu-divider';
        line.setAttribute('role', 'separator');
        return line;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tray-menu-item' + (item.danger ? ' is-danger' : '');
      button.setAttribute('role', 'menuitem');
      button.dataset.id = item.id;
      const icon = document.createElement('i');
      icon.className = item.icon;
      const label = document.createElement('span');
      label.className = 'tray-menu-label';
      label.textContent = item.label;
      button.append(icon, label);
      if (item.hint) {
        const hint = document.createElement('kbd');
        hint.className = 'tray-menu-hint';
        hint.textContent = item.hint;
        button.append(hint);
      }
      return button;
    })
  );
  // The window takes the menu's height and the margin around it for the shadow. Measured at once:
  // the window is hidden now, and a hidden page gets no animation frames
  api.size(Math.ceil(menu.getBoundingClientRect().height) + SHADOW_MARGIN * 2);
  menu.focus();
}

api.onState(render);

list.addEventListener('click', (e) => {
  const item = e.target.closest('.tray-menu-item');
  if (item) api.run(item.dataset.id);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    api.close();
    return;
  }
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const items = [...list.querySelectorAll('.tray-menu-item')];
  const at = items.indexOf(document.activeElement);
  const step = e.key === 'ArrowDown' ? 1 : -1;
  const next =
    at < 0 ? (step > 0 ? 0 : items.length - 1) : (at + step + items.length) % items.length;
  items[next]?.focus();
});

// A menu that did not get the focus never hears a click outside it; it closes a moment after the
// mouse leaves it instead (coming back keeps it open)
let leaveTimer = null;
menu.addEventListener('mouseleave', () => {
  if (document.hasFocus()) return;
  leaveTimer = setTimeout(() => api.close(), 800);
});
menu.addEventListener('mouseenter', () => clearTimeout(leaveTimer));
