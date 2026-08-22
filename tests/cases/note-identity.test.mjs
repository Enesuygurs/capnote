// Saving keeps one note object, and favorite and pin survive an autosave

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Ref';
  a.richEditor.innerHTML = '<p>1</p>';
  a.saveNote();
  await a.editCurrentNote();
  a.richEditor.innerHTML = '<p>2</p>';
  a.saveNote(); // second save of same note
  await a.toggleFavoriteView();
  const stored = (await window.electronAPI.storage.load()).data.notes[0];
  // pin from list while editing, then autosave must not revert it
  await a.editCurrentNote();
  await a.togglePin(a.currentNote.id);
  a.richEditor.innerHTML = '<p>3</p>';
  a.saveNote(true);
  const stored2 = (await window.electronAPI.storage.load()).data.notes[0];
  return {
    sameRef: a.currentNote === a.notes[0],
    favoritePersisted: stored.isFavorite,
    pinSurvivedAutosave: stored2.isPinned,
    content: stored2.content,
  };
}

export const expected = {
  sameRef: true,
  favoritePersisted: true,
  pinSurvivedAutosave: true,
  content: '<p>3</p>',
};
