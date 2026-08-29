// The "take out of the folder" drop zone shows only for a note that is in a folder, translated

export async function run() {
  const a = window.app;
  const c = document.getElementById('notesListContainer');
  a.folders.push({ id: 'f1', name: 'F', color: '#3b82f6', expanded: true });
  a.createNewNote();
  a.noteTitle.value = 'In folder';
  a.richEditor.innerHTML = '<p>x</p>';
  a.saveNote(true);
  const inFolder = a.currentNote;
  inFolder.folderId = 'f1';
  a.createNewNote();
  a.noteTitle.value = 'Root';
  a.richEditor.innerHTML = '<p>x</p>';
  a.saveNote(true);
  const root = a.currentNote;

  const dragOver = (noteId) => {
    a.draggedNoteId = noteId;
    c.classList.remove('drag-over');
    const dt = new DataTransfer();
    dt.setData('text/plain', noteId);
    c.dispatchEvent(
      new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt })
    );
    return c.classList.contains('drag-over');
  };

  const rootShows = dragOver(root.id);
  const folderShows = dragOver(inFolder.id);
  const tr = getComputedStyle(c, '::before').content;
  a.languageSelect.value = 'en';
  a.languageSelect.dispatchEvent(new Event('change'));
  await new Promise((r) => setTimeout(r, 200));
  dragOver(inFolder.id);
  const en = getComputedStyle(c, '::before').content;
  a.draggedNoteId = null;
  return { rootShows, folderShows, tr, en };
}

export const expected = {
  rootShows: false,
  folderShows: true,
  tr: '"Notu klasörden çıkarmak için buraya bırakın"',
  en: '"Drop here to take the note out of its folder"',
};
