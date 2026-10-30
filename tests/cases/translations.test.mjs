// Messages for sections, folders, untitled notes and moves are translated

export async function run() {
  const a = window.app;
  const errors = [];
  window.addEventListener('error', (e) => errors.push(e.message));
  a.languageSelect.value = 'en';
  a.languageSelect.dispatchEvent(new Event('change'));
  a.todoSectionInput.value = 'Work';
  a.addTodoSection();
  const sectionToast = a.notificationText.textContent;
  a.createNewNote();
  a.noteTitle.value = '';
  a.richEditor.innerHTML = '<p>x</p>';
  a.saveNote(true);
  a.richEditor.focus();
  a.insertList('ul');
  a.insertChecklist();
  a.tableRowsInput.value = '1';
  a.tableColsInput.value = '2';
  a.tableHeaderCheckbox.checked = true;
  a.handleInsertTable();
  a.folderNameInput.value = 'Docs';
  await a.createFolder();
  const folderToast = a.notificationText.textContent;
  await a.moveNoteToFolder(a.currentNote.id, a.folders[0].id);
  const moveToast = a.notificationText.textContent;
  a.showTodosScreen();
  return {
    errors,
    sectionToast,
    folderToast,
    moveToast,
    untitled: a.displayTitle(a.currentNote),
    storedTitle: a.currentNote.title,
    editorTemplates: a.richEditor.innerText.replace(/\s+/g, ' ').trim(),
    todoCount: document.querySelector('.todo-section-count')?.textContent,
    emptySection: document.querySelector('.todos-list')?.textContent.trim(),
    weekday: a._weekdayShort(1),
    recurrence: a._recurrenceLabel('weekly'),
    param: (await import(new URL('js/i18n.js', location.href).href)).i18n.t(
      'messages.folderRenamed',
      { name: 'X' }
    ),
  };
}

export const expected = {
  errors: [],
  sectionToast: 'Section added',
  folderToast: 'Folder "Docs" created',
  moveToast: '"Untitled Note" moved to Docs',
  untitled: 'Untitled Note',
  storedTitle: '',
  editorTemplates: 'xHeader 1Header 2',
  todoCount: '0 tasks',
  emptySection: 'No tasks in this section',
  weekday: 'Mon',
  recurrence: 'Weekly',
  param: 'Renamed to "X"',
};
