// Fixes from the logic audit: switching notes keeps edits, autosave never makes an empty note,
// filters bring folders back, a copy has its own history, upload names with brackets are kept,
// tags ignore case, Enter on Cancel does not confirm

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const make = (title) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = '<p>x</p>';
    a.saveNote(true);
    return a.currentNote;
  };

  // Edits are kept when another note is opened from the editor
  const first = make('First');
  const second = make('Second');
  a.selectNote(first);
  await a.editCurrentNote();
  a.richEditor.innerHTML = '<p>edited</p>';
  a.selectNote(second);
  const editKept = first.content === '<p>edited</p>';

  // A pending autosave does not turn a new blank note into "Untitled"
  await a.editCurrentNote();
  a.richEditor.innerHTML = '<p>typing</p>';
  a.scheduleAutoSave();
  const before = a.notes.length;
  a.createNewNote();
  await wait(2300);
  const noEmptyNote = a.notes.length === before;
  a.cancelEdit();

  // Folders hidden by a filter come back when it is cleared
  a.folders.push({ id: 'f9', name: 'Hidden', color: '#3b82f6', expanded: true });
  first.folderId = 'f9';
  a.changeFilter('favorites');
  const hiddenUnderFilter = !document.querySelector('.folder-item[data-folder-id="f9"]');
  a.changeFilter('all');
  const backAfter = !!document.querySelector('.folder-item[data-folder-id="f9"]');

  // A copy has its own history
  a.selectNote(second);
  a.duplicateNote(second);
  const copy = a.currentNote;
  const ownHistory = copy.history !== second.history && copy.history.length === 1;

  // Upload names with brackets are found (and so kept by the cleanup)
  const names = a.extractUploadNames(
    '<img src="capnote-file://upload/1-ab-photo%20(1).png"><a href="capnote-file://upload/it\'s.pdf">f</a>'
  );

  // Tags compare without case
  await a.editCurrentNote();
  a.tags = [];
  a.addTag('Work');
  a.addTag('work');
  const tagCount = a.tags.length;
  a.cancelEdit();

  // Enter while Cancel has focus in the confirm dialog does not confirm
  let confirmed = false;
  a.showConfirm('Sure?', () => (confirmed = true));
  await wait(50);
  const cancel = a.confirmModal.querySelector('.btn-secondary');
  cancel.focus();
  cancel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await wait(50);
  a.hideAllModals();

  return {
    editKept,
    noEmptyNote,
    hiddenUnderFilter,
    backAfter,
    ownHistory,
    names,
    tagCount,
    confirmed,
  };
}

export const expected = {
  editKept: true,
  noEmptyNote: true,
  hiddenUnderFilter: true,
  backAfter: true,
  ownHistory: true,
  names: ['1-ab-photo (1).png', "it's.pdf"],
  tagCount: 1,
  confirmed: false,
};
