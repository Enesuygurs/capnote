// The tasks page: every task of every note in one place. It keeps no list of its own: it reads the
// task lists written in the notes and ticking a task here ticks it in its note. Open tasks with a
// due date come first, in Overdue, Today and Upcoming (each with its note's name); the others are
// grouped by note (the note opens from its group). Notes that cannot be read now (locked, in a locked folder),
// archived notes and file notes are left out. The header's icon counts the tasks still open.
//
// The older to-do page kept its own sections; what was in them moves into a note on start.

import { i18n } from '../i18n.js';
import { isoDay } from './task-dates.js';

export class TodosFeature {
  // The notes whose tasks show here
  taskNotes() {
    return this.notes.filter(
      (note) =>
        !note.isArchived &&
        !note.filePath &&
        !note.isMarkdown &&
        !this.isNoteLockedForView(note) &&
        !this.isNoteHiddenByFolderLock(note) &&
        (note.content || '').includes('checklist-item')
    );
  }

  // A note's tasks, in order: { index, text, done }
  tasksOfNote(note) {
    const body = this.parseInertHtml(note.content || '');
    return [...body.querySelectorAll('.checklist-item')].map((item, index) => ({
      index,
      text: (item.querySelector('label')?.textContent || '').trim(),
      done: !!item.querySelector('input[type="checkbox"]')?.hasAttribute('checked'),
      priority: item.dataset.priority || '',
      due: item.dataset.due || '',
    }));
  }

  // One task's row: its box, its text, and (if asked) when it is due and the note it is in
  taskRow(note, task, { showNote = false } = {}) {
    const row = document.createElement('label');
    row.className = 'task-row';
    row.classList.toggle('is-done', task.done);
    row.dataset.noteId = note.id;
    row.dataset.index = task.index;
    if (task.priority) row.dataset.priority = task.priority;
    row.innerHTML = '<input type="checkbox"><span class="task-row-text"></span>';
    const box = row.querySelector('input');
    box.checked = task.done;
    row.querySelector('.task-row-text').textContent = task.text || '…';
    box.addEventListener('change', () => this.setTaskDone(note, task, box.checked));
    const info = task.due ? this.dueInfo(task.due) : null;
    if (info) {
      const due = document.createElement('small');
      due.className = 'task-row-due';
      due.dataset.dueState = task.done ? 'done' : info.state;
      due.textContent = info.label;
      row.appendChild(due);
    }
    if (showNote) {
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'task-row-note';
      link.innerHTML = '<i class="fas fa-file-lines"></i><span></span>';
      link.querySelector('span').textContent = this.displayTitle(note);
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectNote(note);
      });
      row.appendChild(link);
    }
    return row;
  }

  // Overdue, Today and Upcoming: the open tasks that have a date
  renderDateGroups(box, entries) {
    const today = isoDay(new Date());
    const rank = (t) => (t.priority ? Number(t.priority) : 9);
    const order = (x, y) =>
      x.task.due.localeCompare(y.task.due) ||
      rank(x.task) - rank(y.task) ||
      x.task.index - y.task.index;
    const groups = [
      ['overdue', 'fa-calendar-xmark', entries.filter((e) => e.task.due < today)],
      ['today', 'fa-calendar-day', entries.filter((e) => e.task.due === today)],
      ['upcoming', 'fa-calendar-week', entries.filter((e) => e.task.due > today)],
    ];
    groups.forEach(([name, icon, list]) => {
      if (!list.length) return;
      const section = document.createElement('section');
      section.className = `list-card task-group task-date-group is-${name}`;
      section.innerHTML = `<div class="task-group-title"><i class="fas ${icon}"></i><span></span><small></small></div><div class="task-group-list"></div>`;
      section.querySelector('.task-group-title span').textContent = i18n.t(`todos.group_${name}`);
      section.querySelector('.task-group-title small').textContent = i18n.t('todos.openCount', {
        count: list.length,
      });
      const rows = section.querySelector('.task-group-list');
      list
        .sort(order)
        .forEach(({ note, task }) =>
          rows.appendChild(this.taskRow(note, task, { showNote: true }))
        );
      box.appendChild(section);
    });
  }

  renderTodosSections() {
    const box = this.todosSectionsContainer;
    if (!box) return;
    if (this.showDoneTasksBtn) {
      this.showDoneTasksBtn.classList.toggle('active', !!this.showDoneTasks);
      this.showDoneTasksBtn.querySelector('span').textContent = i18n.t(
        this.showDoneTasks ? 'todos.hideDone' : 'todos.showDone'
      );
    }
    // Open tasks with a date go to the date groups; the rest stay with their notes
    const dated = [];
    const groups = this.taskNotes()
      .map((note) => {
        const tasks = this.tasksOfNote(note).filter((t) => t.text || !t.done);
        tasks
          .filter((t) => t.due && !t.done && t.text)
          .forEach((task) => dated.push({ note, task }));
        // The most urgent first (P1, P2, P3, then the rest), in their order otherwise
        const rank = (t) => (t.priority ? Number(t.priority) : 9);
        const shown = tasks
          .filter((t) => !(t.due && !t.done && t.text))
          .filter((t) => this.showDoneTasks || !t.done)
          .sort((a, b) => rank(a) - rank(b) || a.index - b.index);
        return { note, tasks: shown, all: tasks };
      })
      .filter((group) => group.tasks.length)
      .sort(
        (a, b) =>
          new Date(b.note.updatedAt || b.note.createdAt) -
          new Date(a.note.updatedAt || a.note.createdAt)
      );
    box.innerHTML = '';
    if (!groups.length && !dated.length) {
      box.innerHTML = `<div class="empty-state empty-state-large"><i class="fas fa-list-check"></i><p></p><small></small></div>`;
      box.querySelector('p').textContent = i18n.t('todos.noTodos');
      box.querySelector('small').textContent = i18n.t('todos.noTodosHint');
      return;
    }
    this.renderDateGroups(box, dated);
    groups.forEach(({ note, tasks, all }) => {
      const section = document.createElement('section');
      section.className = 'list-card task-group';
      section.dataset.noteId = note.id;
      const open = all.filter((t) => !t.done).length;
      section.innerHTML = `<button type="button" class="task-group-title"><i class="fas fa-file-lines"></i><span></span><small></small></button><div class="task-group-list"></div>`;
      section.querySelector('.task-group-title span').textContent = this.displayTitle(note);
      section.querySelector('.task-group-title small').textContent = i18n.t('todos.openCount', {
        count: open,
      });
      section
        .querySelector('.task-group-title')
        .addEventListener('click', () => this.selectNote(note));
      const list = section.querySelector('.task-group-list');
      tasks.forEach((task) => list.appendChild(this.taskRow(note, task)));
      box.appendChild(section);
    });
  }

  // Tick (or untick) a task in its note
  async setTaskDone(note, task, done) {
    const body = this.parseInertHtml(note.content || '');
    const item = body.querySelectorAll('.checklist-item')[task.index];
    const label = (item?.querySelector('label')?.textContent || '').trim();
    const input = item?.querySelector('input[type="checkbox"]');
    // The note changed since the page was drawn: drawn again, nothing changed
    if (!item || !input || label !== task.text) {
      this.renderTodosSections();
      return;
    }
    if (done) input.setAttribute('checked', 'checked');
    else input.removeAttribute('checked');
    note.content = body.innerHTML;
    note.updatedAt = new Date().toISOString();
    // A note open in the editor shows the change too
    if (note === this.currentNote && this.isEditorOpen?.()) {
      const live = this.richEditor.querySelectorAll('.checklist-item input[type="checkbox"]')[
        task.index
      ];
      if (live) live.checked = done;
    }
    if (note.isLocked) this.resealNote(note);
    await this.saveNotes();
    this.updateTodosCount();
    // The row stays a moment (its tick seen), then the list follows
    setTimeout(() => this.renderTodosSections(), done && !this.showDoneTasks ? 450 : 0);
  }

  // The header icon's count: the tasks still open
  updateTodosCount() {
    if (!this.todosCount) return;
    const open = this.taskNotes().reduce(
      (sum, note) => sum + this.tasksOfNote(note).filter((t) => !t.done && t.text).length,
      0
    );
    this.setCount(this.todosCount, open);
  }

  // The older to-do page's sections go into a note ("Yapılacaklar"), a heading and a task list
  // per section, ticked ones still ticked; then they are cleared
  async migrateTodoSections() {
    const sections = (this.todoSections || []).filter((s) => (s.todos || []).length);
    if (!sections.length) return false;
    const html = sections
      .map((section) => {
        const items = section.todos
          .map((todo) => {
            const box = document.createElement('div');
            box.innerHTML = this.checklistItemHtml(this.escapeHtml(todo.text || ''));
            if (todo.completed) box.querySelector('input').setAttribute('checked', 'checked');
            return box.innerHTML;
          })
          .join('');
        return `<h3>${this.escapeHtml(section.name || '')}</h3><div class="checklist">${items}</div>`;
      })
      .join('');
    const now = new Date().toISOString();
    this.notes.unshift({
      id: this.newId(),
      title: i18n.t('todos.migratedTitle'),
      content: html + '<p><br></p>',
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      mood: null,
      weather: null,
      tags: [],
      isLocked: false,
      folderId: null,
      formatting: { ...this.getDefaultFormatting() },
      history: [{ type: 'created', ts: now }],
    });
    this.todoSections = [];
    await this.saveNotes();
    await this.saveTodos();
    return true;
  }

  setupTasksPage() {
    this.showDoneTasksBtn?.addEventListener('click', () => {
      this.showDoneTasks = !this.showDoneTasks;
      this.renderTodosSections();
    });
  }
}
