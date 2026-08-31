// Deleting a note also removes its reminders and notifications, with and without confirmation

export async function run() {
  const a = window.app;
  const mk = (t) => {
    a.createNewNote();
    a.noteTitle.value = t;
    a.richEditor.innerHTML = '<p>' + t + '</p>';
    a.saveNote(true);
    return a.currentNote;
  };
  const n1 = mk('one');
  const n2 = mk('two');
  mk('three');
  const future = new Date(Date.now() + 86400000).toISOString();
  a.reminders.push({
    id: 1,
    noteId: n1.id,
    noteTitle: 'one',
    datetime: future,
    recurrence: 'none',
    dismissed: false,
    recurrenceDays: [],
  });
  a.reminders.push({
    id: 2,
    noteId: n2.id,
    noteTitle: 'two',
    datetime: future,
    recurrence: 'none',
    dismissed: false,
    recurrenceDays: [],
  });
  a.notifications.push({
    id: 5,
    noteId: n1.id,
    noteTitle: 'one',
    message: 'm',
    time: future,
    read: false,
  });
  // with confirmation
  a.selectNote(n1);
  a.deleteCurrentNote();
  a.confirmBtn.click();
  const r1 = {
    notes: a.notes.map((n) => n.title),
    reminders: a.reminders.map((r) => r.id),
    notifs: a.notifications.length,
    current: a.currentNote?.title,
  };
  // a second delete asks again
  a.deleteNoteById(n2.id);
  a.confirmBtn.click();
  return {
    r1,
    r2: { notes: a.notes.map((n) => n.title), reminders: a.reminders.map((r) => r.id) },
  };
}

export const expected = {
  r1: {
    notes: ['three', 'two'],
    reminders: [2],
    notifs: 0,
    current: 'three',
  },
  r2: {
    notes: ['three'],
    reminders: [],
  },
};
