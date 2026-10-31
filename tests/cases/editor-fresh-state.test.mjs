// Nothing of the previous note stays in the editor when another note opens: the toolbar state
// (bold, alignment, text style), a half-typed tag, the previous note's reminders, a preview that
// hid the text area. A copy of an archived note shows in the list, and an untitled note's copy
// stays untitled.
export async function run() {
  const a = window.app;
  const r = {};
  const toolbar = () => ({
    active: [
      ...document.querySelectorAll(
        '.format-btn[data-format].active, .format-btn[data-align].active'
      ),
    ].map((b) => b.dataset.format || 'align-' + b.dataset.align),
    style: document.querySelector('#blockStyle .select-selected').textContent,
  });

  // A note with a reminder, a half-typed tag and a toolbar left bold, centered, as a heading
  a.createNewNote();
  a.noteTitle.value = 'First';
  a.richEditor.innerHTML = '<p>text</p>';
  a.saveNote(true);
  a.setReminderMoment(new Date(Date.now() + 86400000));
  await a.addReminder();
  a.tagInput.value = 'half';
  ['bold', 'underline'].forEach((f) =>
    document.querySelector(`.format-btn[data-format="${f}"]`).classList.add('active')
  );
  document.querySelector('.format-btn[data-align="center"]').classList.add('active');
  a.updateCustomDropdown('blockStyle', 'h3');
  a.toggleHtmlMode();

  a.createNewNote();
  r.newNote = {
    toolbar: toolbar(),
    tagInput: a.tagInput.value,
    reminders: a.noteRemindersList.querySelectorAll('.note-reminder-item').length,
    textAreaShown: !a.richEditor.classList.contains('hidden'),
  };
  a.cancelEdit();

  // Opening a saved note for editing starts clean too
  document.querySelector('.format-btn[data-format="italic"]').classList.add('active');
  a.selectNote(a.notes.find((n) => n.title === 'First'));
  await a.editCurrentNote();
  r.editNote = toolbar();
  a.cancelEdit();

  // Copies
  const first = a.notes.find((n) => n.title === 'First');
  first.isArchived = true;
  r.copyOfArchived = a.makeDuplicate(first).isArchived;
  a.createNewNote();
  a.richEditor.innerHTML = '<p>no title</p>';
  a.saveNote(true);
  r.untitledCopyTitle = a.makeDuplicate(a.currentNote).title;
  a.cancelEdit();
  return r;
}

export const expected = {
  newNote: {
    toolbar: { active: ['align-left'], style: 'Metin' },
    tagInput: '',
    reminders: 0,
    textAreaShown: true,
  },
  editNote: { active: ['align-left'], style: 'Metin' },
  copyOfArchived: false,
  untitledCopyTitle: '',
};
