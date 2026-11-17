// Task priorities, as in task managers: P1 (urgent, red), P2 (high, orange), P3 (medium, blue)
// or none. A task keeps it as data-priority on its .checklist-item and its box takes the color.
// It is set from a small flag that shows beside a task under the pointer, or with a right-click on
// the task: in the editor, in a note being read and on the tasks page.

import { i18n } from '../i18n.js';

const LEVELS = ['1', '2', '3', ''];

export class TaskPriorityFeature {
  taskPriorityLabel(level) {
    return i18n.t(level ? `tasks.priority${level}` : 'tasks.priorityNone');
  }

  // Where a task is: in the editor (its element), or in a note's saved text (the note and its index)
  taskTargetOf(element) {
    const item = element?.closest?.('.checklist-item, .task-row');
    if (!item) return null;
    if (this.richEditor.contains(item) && this.isEditorOpen()) return { live: item };
    if (this.viewerText.contains(item) && this.currentNote && !this.currentNote.isVersionPreview) {
      const index = [...this.viewerText.querySelectorAll('.checklist-item')].indexOf(item);
      return index === -1 ? null : { note: this.currentNote, index, element: item };
    }
    if (item.matches('.task-row')) {
      const note = this.notes.find((n) => n.id === item.dataset.noteId);
      return note ? { note, index: Number(item.dataset.index), element: item } : null;
    }
    return null;
  }

  currentPriorityOf(target) {
    if (target.live) return target.live.dataset.priority || '';
    return target.element?.dataset.priority || '';
  }

  async setTaskPriority(target, level) {
    const apply = (item) => {
      if (level) item.dataset.priority = level;
      else delete item.dataset.priority;
    };
    if (target.live) {
      apply(target.live);
      this.trackContentChanges();
      return;
    }
    // In the note's saved text
    const { note, index } = target;
    const body = this.parseInertHtml(note.content || '');
    const item = body.querySelectorAll('.checklist-item')[index];
    if (!item) return;
    apply(item);
    note.content = body.innerHTML;
    note.updatedAt = new Date().toISOString();
    if (note.isLocked) this.resealNote(note);
    await this.saveNotes();
    if (note === this.currentNote && this.isViewerOpen()) this.displayNote(note);
    if (this.currentScreen === 'todos') this.renderTodosSections();
  }

  showTaskPriorityMenu(target, x, y) {
    const menu = this.taskPriorityMenu;
    if (!menu || !target) return;
    this.taskPriorityTarget = target;
    const current = this.currentPriorityOf(target);
    menu.querySelectorAll('[data-priority]').forEach((item) => {
      item.classList.toggle('active', item.dataset.priority === current);
    });
    this.positionMenu(menu, x, y);
  }

  hideTaskPriorityMenu() {
    this.taskPriorityMenu?.classList.add('hidden');
    this.taskPriorityTarget = null;
  }

  // The flag beside the task under the pointer
  placeTaskFlag(item) {
    const flag = this.taskFlag;
    if (!flag) return;
    // A task no longer on the page (the note was drawn again) has no flag
    if (!item || !item.isConnected) {
      flag.hidden = true;
      this.taskFlagItem = null;
      return;
    }
    this.taskFlagItem = item;
    const rect = item.getBoundingClientRect();
    const level = item.dataset.priority || '';
    flag.dataset.priority = level;
    flag.title = this.taskPriorityLabel(level);
    flag.style.top = `${Math.round(rect.top + Math.min(rect.height, 32) / 2 - 12)}px`;
    flag.style.left = `${Math.round(rect.right - 28)}px`;
    flag.hidden = false;
  }

  setupTaskPriority() {
    const menu = document.createElement('div');
    menu.className = 'context-menu menu hidden task-priority-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = LEVELS.map(
      (level) =>
        `<button type="button" class="menu-item" data-priority="${level}" role="menuitem"><i class="fas fa-flag"></i><span></span></button>`
    ).join('');
    document.body.appendChild(menu);
    this.taskPriorityMenu = menu;
    const label = () =>
      menu.querySelectorAll('[data-priority]').forEach((item) => {
        item.querySelector('span').textContent = this.taskPriorityLabel(item.dataset.priority);
      });
    label();
    this.relabelTaskPriorityMenu = label;
    menu.addEventListener('mousedown', (e) => e.preventDefault());
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-priority]');
      const target = this.taskPriorityTarget;
      this.hideTaskPriorityMenu();
      if (item && target) this.setTaskPriority(target, item.dataset.priority);
    });
    document.addEventListener('mousedown', (e) => {
      if (!menu.contains(e.target) && e.target !== this.taskFlag) this.hideTaskPriorityMenu();
    });
    window.addEventListener('blur', () => {
      this.hideTaskPriorityMenu();
      this.placeTaskFlag(null);
    });

    const flag = document.createElement('button');
    flag.type = 'button';
    flag.className = 'task-flag';
    flag.hidden = true;
    flag.innerHTML = '<i class="fas fa-flag"></i>';
    document.body.appendChild(flag);
    this.taskFlag = flag;
    // Clicking the flag keeps the caret where it is
    flag.addEventListener('mousedown', (e) => e.preventDefault());
    flag.addEventListener('click', () => {
      const target = this.taskTargetOf(this.taskFlagItem);
      const rect = flag.getBoundingClientRect();
      this.showTaskPriorityMenu(target, rect.left, rect.bottom + 4);
    });

    // The flag follows the task under the pointer; a right-click on a task opens the menu
    const areas = [this.richEditor, this.viewerText, this.todosSectionsContainer].filter(Boolean);
    areas.forEach((area) => {
      area.addEventListener('mousemove', (e) => {
        const item = e.target.closest?.('.checklist-item, .task-row');
        if (item !== this.taskFlagItem)
          this.placeTaskFlag(item && this.taskTargetOf(item) ? item : null);
      });
      area.addEventListener('mouseleave', (e) => {
        if (e.relatedTarget !== flag) this.placeTaskFlag(null);
      });
      area.addEventListener('contextmenu', (e) => {
        const target = this.taskTargetOf(e.target);
        if (!target) return;
        e.preventDefault();
        this.showTaskPriorityMenu(target, e.clientX, e.clientY);
      });
    });
    flag.addEventListener('mouseleave', (e) => {
      if (!this.taskFlagItem?.contains(e.relatedTarget)) this.placeTaskFlag(null);
    });
    // Scrolling or typing moves things: the flag goes until the pointer moves again
    document.addEventListener('scroll', () => this.placeTaskFlag(null), true);
    this.richEditor?.addEventListener('keydown', () => this.placeTaskFlag(null));
  }
}
