// Edits within ten minutes merge into one history entry

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'H';
  a.richEditor.innerHTML = '<p>1</p>';
  a.saveNote(true);
  const n = a.currentNote;
  a.openNoteHistory();
  const emptyText = a.historyBody.querySelector('.history-empty')?.textContent;
  a.hideModal(a.noteHistoryModal);
  await a.editCurrentNote();
  a.richEditor.innerHTML = '<p>2</p>';
  a.saveNote(true);
  a.richEditor.innerHTML = '<p>3</p>';
  a.saveNote(true); // within 10 minutes -> merged
  a.saveNote(true); // no change -> nothing
  const mergedCount = n.history.filter((h) => h.type === 'updated').length;
  n.history[n.history.length - 1].ts = new Date(Date.now() - 3600000).toISOString(); // pretend an hour passed
  a.richEditor.innerHTML = '<p>4</p>';
  a.saveNote(true);
  const afterHour = n.history.filter((h) => h.type === 'updated').length;
  a.saveNote();
  a.openNoteHistory();
  const items = a.historyBody.querySelectorAll('.history-item').length;
  const stored = (await window.electronAPI.storage.load()).data.notes.find((x) => x.id === n.id)
    .history.length;
  return { emptyText, mergedCount, afterHour, items, stored };
}

export const expected = {
  emptyText: 'Henüz düzenleme yok',
  mergedCount: 1,
  afterHour: 2,
  items: 2,
  stored: 3,
};
