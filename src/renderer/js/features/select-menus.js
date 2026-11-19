// The drop-down lists of the settings in the app's own look. A <select> opens the system's plain
// list, which cannot be styled; each one gets a button that opens a menu like the app's other
// menus (the choice ticked). The <select> stays, hidden, as the value: a choice sets it and fires
// its "change", so the settings code is the same as before.

export class SelectMenusFeature {
  // Every <select class="select-small"> under root gets its button (once)
  enhanceSelects(root = document) {
    root.querySelectorAll('select.select-small:not([data-enhanced])').forEach((select) => {
      select.dataset.enhanced = 'true';
      select.classList.add('select-native');
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'select-small select-trigger';
      button.setAttribute('aria-haspopup', 'listbox');
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = '<span class="select-trigger-label"></span>';
      select.after(button);
      select.selectTrigger = button;
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.openSelect === select) this.closeSelectMenu();
        else this.openSelectMenu(select, e.detail === 0);
      });
      button.addEventListener('keydown', (e) => {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
          e.preventDefault();
          this.openSelectMenu(select, true);
        }
      });
      // A value set from the code (and fired) shows on the button
      select.addEventListener('change', () => this.refreshSelectTrigger(select));
      this.refreshSelectTrigger(select);
    });
  }

  refreshSelectTrigger(select) {
    const label = select.selectTrigger?.querySelector('.select-trigger-label');
    if (label) label.textContent = select.selectedOptions[0]?.textContent.trim() || '';
  }

  // Values set without an event (settings loaded, the language changed): the buttons follow
  refreshSelectTriggers() {
    document
      .querySelectorAll('select[data-enhanced]')
      .forEach((select) => this.refreshSelectTrigger(select));
  }

  selectMenuElement() {
    if (this.selectMenu) return this.selectMenu;
    const menu = document.createElement('div');
    menu.className = 'context-menu menu select-menu hidden';
    menu.setAttribute('role', 'listbox');
    document.body.appendChild(menu);
    menu.addEventListener('mousedown', (e) => e.preventDefault());
    menu.addEventListener('keydown', (e) => this.handleSelectMenuKeys(e));
    document.addEventListener('mousedown', (e) => {
      if (!menu.contains(e.target) && e.target !== this.openSelect?.selectTrigger) {
        this.closeSelectMenu();
      }
    });
    window.addEventListener('blur', () => this.closeSelectMenu());
    document.addEventListener(
      'scroll',
      (e) => {
        if (!menu.contains(e.target)) this.closeSelectMenu();
      },
      true
    );
    this.selectMenu = menu;
    return menu;
  }

  // (byKeyboard: the chosen item takes the focus, for the arrows; with the pointer nothing is
  // focused, so no focus ring shows)
  openSelectMenu(select, byKeyboard = false) {
    const menu = this.selectMenuElement();
    const trigger = select.selectTrigger;
    this.closeSelectMenu();
    menu.innerHTML = '';
    [...select.options].forEach((option) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'menu-item';
      item.setAttribute('role', 'option');
      const chosen = option.value === select.value;
      item.classList.toggle('active', chosen);
      item.setAttribute('aria-selected', String(chosen));
      item.innerHTML = '<span></span><i class="fas fa-check select-menu-check"></i>';
      item.querySelector('span').textContent = option.textContent.trim();
      item.addEventListener('click', () => this.chooseSelectOption(select, option.value));
      menu.appendChild(item);
    });
    const rect = trigger.getBoundingClientRect();
    menu.style.minWidth = `${Math.round(rect.width)}px`;
    this.positionMenu(menu, rect.left, rect.bottom + 4);
    this.openSelect = select;
    trigger.setAttribute('aria-expanded', 'true');
    trigger.classList.add('open');
    if (byKeyboard) {
      (menu.querySelector('.menu-item.active') || menu.querySelector('.menu-item'))?.focus();
    }
  }

  closeSelectMenu({ focusTrigger = false } = {}) {
    const select = this.openSelect;
    if (!select) return;
    this.openSelect = null;
    this.selectMenu?.classList.add('hidden');
    select.selectTrigger?.setAttribute('aria-expanded', 'false');
    select.selectTrigger?.classList.remove('open');
    if (focusTrigger) select.selectTrigger?.focus();
  }

  chooseSelectOption(select, value) {
    this.closeSelectMenu({ focusTrigger: true });
    if (select.value === value) return;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  handleSelectMenuKeys(e) {
    const items = [...this.selectMenu.querySelectorAll('.menu-item')];
    const at = items.indexOf(document.activeElement);
    const move = (step) => items[(at + step + items.length) % items.length]?.focus();
    if (e.key === 'ArrowDown') move(1);
    else if (e.key === 'ArrowUp') move(-1);
    else if (e.key === 'Home') items[0]?.focus();
    else if (e.key === 'End') items[items.length - 1]?.focus();
    else if (e.key === 'Escape') this.closeSelectMenu({ focusTrigger: true });
    else if (e.key === 'Tab') this.closeSelectMenu({ focusTrigger: true });
    else return;
    e.preventDefault();
    // Escape closes the list, not the settings around it
    e.stopPropagation();
  }
}
