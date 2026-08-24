// To-do sections and tasks

import { i18n } from '../i18n.js';

export class TodosFeature {
  renderTodosSections() {
    if (!this.todosSectionsContainer) return;

    if (this.todoSections.length === 0) {
      this.todosSectionsContainer.innerHTML = `
        <div class="empty-state empty-state-large">
          <i class="fas fa-list-check"></i>
          <p>${i18n.t('todos.noTodos')}</p>
        </div>
      `;
      return;
    }

    this.todosSectionsContainer.innerHTML = this.todoSections
      .map((section) => {
        const activeTodos = section.todos.filter((t) => !t.completed).length;
        const todosHtml =
          section.todos.length === 0
            ? `<p class="empty-hint">${i18n.t('todos.noTodosInSection')}</p>`
            : section.todos
                .map(
                  (todo) => `
          <div class="todo-item ${todo.completed ? 'completed' : ''}" data-todo-id="${todo.id}" data-section-id="${section.id}">
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} data-action="toggle" data-todo-id="${todo.id}" data-section-id="${section.id}">
            <span class="todo-text" data-todo-id="${todo.id}">${this.escapeHtml(todo.text)}</span>
            <input type="text" class="todo-edit-input hidden" value="${this.escapeHtml(todo.text)}" data-todo-id="${todo.id}" data-section-id="${section.id}">
            <div class="todo-actions">
              <button class="btn-icon btn-icon-xs edit-todo" data-action="edit" data-todo-id="${todo.id}" data-section-id="${section.id}" title="${i18n.t('actions.edit')}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-icon btn-icon-xs btn-icon-danger delete-todo" data-action="delete" data-todo-id="${todo.id}" data-section-id="${section.id}" title="${i18n.t('actions.delete')}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `
                )
                .join('');

        return `
        <div class="card todo-section" data-section-id="${section.id}">
          <div class="todo-section-header">
            <div class="todo-section-title">
              <h3>${this.escapeHtml(section.name)}</h3>
              <span class="chip todo-section-count">${i18n.t('todos.taskCount', { count: activeTodos })}</span>
            </div>
            <button class="btn-icon btn-icon-sm btn-icon-danger delete-section" data-action="delete-section" data-section-id="${section.id}" title="${i18n.t('actions.delete')}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
          <div class="todos-list">
            ${todosHtml}
          </div>
          <div class="input-row">
            <input type="text" class="form-input todo-input" placeholder="${i18n.t('placeholders.newTodo')}" data-section-id="${section.id}">
            <button class="btn-primary add-todo-btn" data-section-id="${section.id}">
              <i class="fas fa-plus"></i> ${i18n.t('buttons.add')}
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    // Add event listeners
    this.attachTodoEventListeners();
  }

  attachTodoEventListeners() {
    // Section delete buttons
    this.todosSectionsContainer
      .querySelectorAll('[data-action="delete-section"]')
      .forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteTodoSection(btn.dataset.sectionId);
        });
      });

    // Add todo buttons
    this.todosSectionsContainer.querySelectorAll('.add-todo-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const sectionId = btn.dataset.sectionId;
        const input = this.todosSectionsContainer.querySelector(
          `.todo-input[data-section-id="${sectionId}"]`
        );
        this.addTodoToSection(sectionId, input.value);
      });
    });

    // Todo input enter key
    this.todosSectionsContainer.querySelectorAll('.todo-input').forEach((input) => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          this.addTodoToSection(input.dataset.sectionId, input.value);
        }
      });
    });

    // Todo action buttons
    this.todosSectionsContainer.querySelectorAll('[data-action]').forEach((btn) => {
      if (btn.dataset.action === 'delete-section') return; // Already handled

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const todoId = btn.dataset.todoId;
        const sectionId = btn.dataset.sectionId;

        if (action === 'toggle') {
          this.toggleTodoComplete(sectionId, todoId);
        } else if (action === 'edit') {
          this.editTodo(sectionId, todoId);
        } else if (action === 'delete') {
          this.deleteTodo(sectionId, todoId);
        }
      });
    });

    // Todo edit inputs
    this.todosSectionsContainer.querySelectorAll('.todo-edit-input').forEach((input) => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.saveTodoEdit(input.dataset.sectionId, input.dataset.todoId, input.value);
        }
      });
      input.addEventListener('blur', (e) => {
        this.saveTodoEdit(input.dataset.sectionId, input.dataset.todoId, input.value);
      });
    });
  }

  addTodoSection() {
    const name = this.todoSectionInput.value.trim();
    if (!name) return;

    const newSection = {
      id: this.newId(),
      name: name,
      todos: [],
    };

    this.todoSections.push(newSection);
    this.saveTodos();
    this.todoSectionInput.value = '';
    this.renderTodosSections();
    this.showNotification(i18n.t('todos.sectionAdded'), 'success');
  }

  deleteTodoSection(sectionId) {
    this.todoSections = this.todoSections.filter((s) => s.id !== sectionId);
    this.saveTodos();
    this.renderTodosSections();
    this.updateTodosCount();
    this.showNotification(i18n.t('todos.sectionDeleted'), 'success');
  }

  addTodoToSection(sectionId, text) {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const section = this.todoSections.find((s) => s.id === sectionId);
    if (!section) return;

    const newTodo = {
      id: this.newId(),
      text: trimmedText,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    section.todos.unshift(newTodo);
    this.saveTodos();
    this.renderTodosSections();
    this.updateTodosCount();
    this.showNotification(i18n.t('todos.todoAdded'), 'success');
  }

  toggleTodoComplete(sectionId, todoId) {
    const section = this.todoSections.find((s) => s.id === sectionId);
    if (!section) return;

    const todo = section.todos.find((t) => t.id === todoId);
    if (!todo) return;

    todo.completed = !todo.completed;
    this.saveTodos();
    this.renderTodosSections();
    this.updateTodosCount();

    if (todo.completed) {
      this.showNotification(i18n.t('todos.todoCompleted'), 'success');
    }
  }

  editTodo(sectionId, todoId) {
    const todoItem = this.todosSectionsContainer.querySelector(
      `.todo-item[data-todo-id="${todoId}"][data-section-id="${sectionId}"]`
    );
    if (!todoItem) return;

    const textSpan = todoItem.querySelector('.todo-text');
    const editInput = todoItem.querySelector('.todo-edit-input');
    const editBtn = todoItem.querySelector('.edit-todo');

    if (editInput.classList.contains('hidden')) {
      // Start editing
      textSpan.classList.add('hidden');
      editInput.classList.remove('hidden');
      editInput.focus();
      editInput.select();
      editBtn.innerHTML = '<i class="fas fa-check"></i>';
    } else {
      // Save edit
      this.saveTodoEdit(sectionId, todoId, editInput.value);
    }
  }

  saveTodoEdit(sectionId, todoId, newText) {
    const text = newText.trim();
    if (!text) return;

    const section = this.todoSections.find((s) => s.id === sectionId);
    if (!section) return;

    const todo = section.todos.find((t) => t.id === todoId);
    if (!todo) return;

    todo.text = text;
    this.saveTodos();
    this.renderTodosSections();
    this.showNotification(i18n.t('todos.todoUpdated'), 'success');
  }

  deleteTodo(sectionId, todoId) {
    const section = this.todoSections.find((s) => s.id === sectionId);
    if (!section) return;

    section.todos = section.todos.filter((t) => t.id !== todoId);
    this.saveTodos();
    this.renderTodosSections();
    this.updateTodosCount();
    this.showNotification(i18n.t('todos.todoDeleted'), 'success');
  }

  updateTodosCount() {
    const open = this.todoSections.reduce(
      (sum, section) => sum + section.todos.filter((t) => !t.completed).length,
      0
    );
    this.setCount(this.todosCount, open);
  }
}
