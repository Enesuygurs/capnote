// Repeating tasks: a repeat in words sets the rule and the first date; ticking one moves its date
// on to the next time after today and empties its box (in a note being read and on the tasks
// page); the menu sets and removes a repeat, and removing the date removes the repeat too

export async function run() {
  const a = window.app;
  const { findRepeatPhrase, nextOccurrence, nextDueAfterToday } =
    await import('./js/features/task-repeat.js');
  const { isoDay } = await import('./js/features/task-dates.js');
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const r = {};
  const now = new Date(2026, 10, 17, 10); // a Tuesday
  r.phrases = [
    'Spor her gün',
    'Her pazartesi toplantı',
    'Kira her ayın 5’i',
    'Rapor hafta içi',
    'Su iç 2 günde bir',
    'Gym every friday',
    'Bu her gün değil ortada',
  ].map((t) => {
    const f = findRepeatPhrase(t, now);
    return f ? `${f.rule}@${f.iso}` : null;
  });
  r.next = [
    isoDay(nextOccurrence('weekdays', new Date(2026, 10, 20))),
    isoDay(nextOccurrence('monthly:31', new Date(2027, 0, 31))),
    isoDay(nextOccurrence('weeks:2', now)),
  ];
  // An overdue daily task moves on to tomorrow, not to a day still past
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  r.catchesUp =
    isoDay(nextDueAfterToday('daily', isoDay(new Date(Date.now() - 5 * 864e5)))) ===
    isoDay(tomorrow);

  // In the editor: the words set it
  a.createNewNote();
  a.noteTitle.value = 'Alışkanlıklar';
  a.richEditor.innerHTML =
    '<div class="checklist">' +
    a.checklistItemHtml('Spor her gün') +
    a.checklistItemHtml('Kitap') +
    '</div>';
  const first = a.richEditor.querySelector('.checklist-item');
  a.applyDuePhrase(first);
  r.editor = [
    first.querySelector('label').textContent,
    first.dataset.repeat,
    first.dataset.due === isoDay(today),
  ];
  a.saveNote(true);
  const note = a.currentNote;

  // Ticked in the note being read
  a.selectNote(note);
  const box = a.viewerText.querySelector('.checklist-item input');
  box.click();
  await wait(600);
  const stored = () => a.parseInertHtml(note.content).querySelectorAll('.checklist-item');
  r.viewerTick = [
    stored()[0].dataset.due === isoDay(tomorrow),
    stored()[0].querySelector('input').hasAttribute('checked'),
  ];

  // Ticked on the tasks page: it moves on again
  a.renderTodosSections();
  const row = [...a.todosSectionsContainer.querySelectorAll('.task-row')].find((x) =>
    x.textContent.includes('Spor')
  );
  row.querySelector('input').click();
  await wait(600);
  const dayAfter = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1);
  r.pageTick = [
    stored()[0].dataset.due === isoDay(dayAfter),
    stored()[0].querySelector('input').hasAttribute('checked'),
  ];

  // The menu: weekly on the second task, then its date removed (the repeat goes too)
  a.renderTodosSections();
  const rowOf = (text) =>
    [...a.todosSectionsContainer.querySelectorAll('.task-row')].find((x) =>
      x.textContent.includes(text)
    );
  await a.setTaskRepeat(a.taskTargetOf(rowOf('Kitap')), 'weekly');
  r.menuSet = [stored()[1].dataset.repeat, !!stored()[1].dataset.due];
  a.renderTodosSections();
  await a.setTaskDue(a.taskTargetOf(rowOf('Kitap')), '');
  r.menuCleared = [stored()[1].dataset.repeat || '', stored()[1].dataset.due || ''];
  return r;
}

export const expected = {
  phrases: [
    'daily@2026-11-17',
    'weekly@2026-11-23',
    'monthly:5@2026-12-05',
    'weekdays@2026-11-17',
    'days:2@2026-11-17',
    'weekly@2026-11-20',
    null,
  ],
  next: ['2026-11-23', '2027-02-28', '2026-12-01'],
  catchesUp: true,
  editor: ['Spor', 'daily', true],
  viewerTick: [true, false],
  pageTick: [true, false],
  menuSet: ['weekly', true],
  menuCleared: ['', ''],
};
