// Cancelling a new note removes it, also when something was written and saved automatically in it
// (with its reminders), and returns to the previous note, or to the home page. A note saved with
// the Save button stays when a later edit is cancelled.

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Kept';
  a.richEditor.innerHTML = '<p>k</p>';
  a.saveNote();
  a.createNewNote();
  a.cancelEdit();
  const r1 = { current: a.currentNote?.title, viewer: a.isViewerOpen(), count: a.notes.length };

  // Written in and saved automatically, with a reminder: cancelling removes it all
  a.createNewNote();
  a.noteTitle.value = 'Draft';
  a.richEditor.innerHTML = '<p>some text</p>';
  a.saveNote(true);
  const draftId = a.currentNote.id;
  a.setReminderMoment(new Date(Date.now() + 86400000));
  await a.addReminder();
  const hadReminder = a.reminders.some((r) => r.noteId === draftId);
  a.cancelEdit();
  const written = {
    hadReminder,
    notes: a.notes.map((n) => n.title),
    reminders: a.reminders.filter((r) => r.noteId === draftId).length,
    open: a.currentNote?.title,
  };

  // Saved with the Save button, then edited and cancelled: it stays
  a.createNewNote();
  a.noteTitle.value = 'Saved';
  a.saveNote();
  await a.editCurrentNote();
  a.noteTitle.value = 'Saved changed';
  a.cancelEdit();
  const saved = a.notes.map((n) => n.title).sort();

  a.notes = [];
  a.currentNote = null;
  a.createNewNote();
  a.cancelEdit();
  return {
    r1,
    written,
    saved,
    r2: { current: a.currentNote, home: !a.welcomeScreen.classList.contains('hidden') },
  };
}

export const expected = {
  r1: {
    current: 'Kept',
    viewer: true,
    count: 1,
  },
  written: { hadReminder: true, notes: ['Kept'], reminders: 0, open: 'Kept' },
  saved: ['Kept', 'Saved'],
  r2: {
    current: null,
    home: true,
  },
};
