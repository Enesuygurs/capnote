// The list follows the open note's title as it is typed, a template note's title shows at once,
// cancelling puts back the saved title; the reminder picker closes when another note opens and
// a new note starts with an empty reminder form
export async function run() {
  const a = window.app;
  const listTitle = () =>
    document.querySelector(`.note-item[data-note-id="${a.currentNote.id}"] .note-item-title`)
      ?.textContent;
  const r = {};
  a.createNoteFromTemplate('meeting');
  r.template = listTitle() === a.noteTitle.value && a.noteTitle.value !== '';
  a.noteTitle.value = 'Typed';
  a.noteTitle.dispatchEvent(new Event('input'));
  r.typed = listTitle();
  a.saveNote(true);
  await a.editCurrentNote();
  a.noteTitle.value = 'Changed';
  a.noteTitle.dispatchEvent(new Event('input'));
  a.cancelEdit();
  r.cancelled = listTitle();

  await a.editCurrentNote();
  a.dashboardToday = '2026-03-02T12:00:00';
  a.reminderWhenBtn.click();
  a.reminderPicker.querySelector('[data-day="2026-03-05"]').click();
  a.dashboardToday = null;
  a.createNoteFromTemplate('weekly');
  r.pickerClosed = a.reminderPicker.classList.contains('hidden');
  r.formEmpty =
    a.reminderDatetime.value === '' && !a.reminderWhenBtn.classList.contains('has-value');
  a.cancelEdit();
  return r;
}

export const expected = {
  template: true,
  typed: 'Typed',
  cancelled: 'Typed',
  pickerClosed: true,
  formEmpty: true,
};
