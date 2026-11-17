// Due dates of tasks: a date in words at the start or end of a task becomes its date (the words
// leave the text, a capital stays), a label says when it is due, the saved text keeps the date and
// not the label, the task menu sets and removes it, and the tasks page groups dated tasks into
// Overdue, Today and Upcoming

export async function run() {
  const a = window.app;
  const { findDuePhrase, isoDay } = await import('./js/features/task-dates.js');
  const r = {};
  const now = new Date(2026, 10, 17, 10);
  r.phrases = [
    'Raporu gönder yarın',
    'Cumaya sunum',
    'Kira ay sonu',
    'Proje 15.03',
    'Sürüm 1.2 çıktı',
    'Bu cümlede yarın ortada',
    'Call mom tomorrow',
  ].map((t) => findDuePhrase(t, now)?.iso || null);

  const day = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return isoDay(d);
  };
  a.createNewNote();
  a.noteTitle.value = 'İşler';
  a.richEditor.innerHTML =
    '<div class="checklist">' +
    a.checklistItemHtml('Yarın raporu gönder') +
    a.checklistItemHtml('Faturayı öde') +
    a.checklistItemHtml('Spor') +
    a.checklistItemHtml('Kitap oku') +
    '</div>';
  const items = a.richEditor.querySelectorAll('.checklist-item');
  r.applied = a.applyDuePhrase(items[0]);
  r.text = items[0].querySelector('label').textContent;
  r.due = items[0].dataset.due === day(1);
  r.label = items[0].dataset.dueLabel;
  items[1].dataset.due = day(-3);
  items[2].dataset.due = day(0);
  a.refreshDueLabels(a.richEditor);
  r.states = [...items].map((i) => i.dataset.dueState || '');
  const saved = a.getCurrentNoteContent().content;
  r.savedKeepsDate = saved.includes('data-due=') && !saved.includes('data-due-label');
  a.saveNote(true);
  const note = a.currentNote;

  // The tasks page
  a.showTodosScreen?.();
  a.renderTodosSections();
  const groups = () =>
    [...a.todosSectionsContainer.querySelectorAll('.task-group')].map(
      (g) =>
        g.querySelector('.task-group-title span').textContent +
        ':' +
        [...g.querySelectorAll('.task-row-text')].map((s) => s.textContent).join('|')
    );
  r.groups = groups();

  // The menu: tomorrow on the undated one, then the date removed from the overdue one
  const rowOf = (text) =>
    [...a.todosSectionsContainer.querySelectorAll('.task-row')].find((row) =>
      row.textContent.includes(text)
    );
  await a.setTaskDue(a.taskTargetOf(rowOf('Kitap oku')), day(1));
  await a.setTaskDue(a.taskTargetOf(rowOf('Faturayı öde')), '');
  a.renderTodosSections();
  r.afterMenu = groups();
  r.stored = (note.content.match(/data-due="/g) || []).length;
  return r;
}

export const expected = {
  phrases: ['2026-11-18', '2026-11-20', '2026-11-30', '2027-03-15', null, null, '2026-11-18'],
  applied: true,
  text: 'Raporu gönder',
  due: true,
  label: 'Yarın',
  states: ['soon', 'overdue', 'today', ''],
  savedKeepsDate: true,
  groups: ['Gecikmiş:Faturayı öde', 'Bugün:Spor', 'Yaklaşan:Raporu gönder', 'İşler:Kitap oku'],
  afterMenu: ['Bugün:Spor', 'Yaklaşan:Raporu gönder|Kitap oku', 'İşler:Faturayı öde'],
  stored: 3,
};
