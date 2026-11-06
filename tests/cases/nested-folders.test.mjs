// Folders in folders: a folder shows the folders inside it (first) and then its notes, its count
// takes in the notes of the folders inside it, a folder cannot go into itself or into one of its
// own folders, a subfolder can be taken out to the top, two folders side by side cannot share a
// name (in different folders they can), a subfolder is not pinned, and deleting a folder deletes
// the folders inside it and their notes.

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const r = {};
  const folder = async (name, parentId = null) => {
    a.showFolderModal(parentId);
    a.folderNameInput.value = name;
    await a.createFolder();
    return a.folders.find((f) => f.name === name && (f.parentId || null) === parentId);
  };
  const note = (title, folderId) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = `<p>${title}</p>`;
    a.saveNote(true);
    const made = a.currentNote;
    a.escapeEditor();
    made.folderId = folderId;
    return made;
  };

  const work = await folder('Work');
  const projects = await folder('Projects', work.id);
  const app = await folder('App', projects.id);
  note('Plan', work.id);
  note('Spec', projects.id);
  note('Bugs', app.id);
  await a.saveNotes();
  a.updateFoldersList();
  await wait(50);

  // The tree as drawn: each folder's rows, folders first
  const rowsOf = (folderId) =>
    [
      ...document.querySelector(`.folder-notes-container[data-folder-id="${folderId}"]`).children,
    ].map((el) =>
      el.classList.contains('folder-container')
        ? 'folder:' + el.querySelector('.nav-text').textContent
        : el.querySelector('.note-item-title')?.textContent
    );
  r.tree = { work: rowsOf(work.id), projects: rowsOf(projects.id), app: rowsOf(app.id) };
  r.topLevel = [
    ...document.querySelectorAll(
      '#notesList > .folder-container, #foldersList > .folder-container'
    ),
  ].map((el) => el.querySelector('.nav-text').textContent);
  const count = (f) =>
    document.querySelector(`.folder-item[data-folder-id="${f.id}"] .folder-count`).textContent;
  r.counts = [count(work), count(projects), count(app)];

  // Not into itself or into its own folder
  await a.moveFolder(work.id, app.id);
  r.loopRefused = { parent: work.parentId || null, can: a.canNestFolder(work.id, app.id) };

  // Same name side by side is refused; in another folder it is fine
  const before = a.folders.length;
  await folder('Projects', work.id);
  r.sameNameRefused = a.folders.length === before;
  await folder('Projects');
  r.sameNameElsewhere = a.folders.length === before + 1;

  // A subfolder: no pin in its menu, and pinning it does nothing
  a.showFolderContextMenu(10, 10, app.id);
  r.pinItemHidden = a.pinFolderMenuItem.hidden;
  a.hideContextMenu();
  await a.togglePinFolders([app.id]);
  r.subfolderPinned = !!app.isPinned;

  // Taken out to the top
  await a.moveFolder(app.id, null);
  r.outToTop = { parent: app.parentId || null, inWork: rowsOf(projects.id).includes('folder:App') };
  await a.moveFolder(app.id, projects.id);

  // Deleting Work deletes Projects, App and their notes
  a.selectedFolderId = work.id;
  a.deleteSelectedFolder();
  r.deleteMessage = a.confirmMessage.textContent;
  document.getElementById('confirmBtn').click();
  await wait(50);
  r.afterDelete = {
    folders: a.folders.map((f) => f.name),
    notes: a.notes.map((n) => n.title),
  };
  return r;
}

export const expected = {
  tree: {
    work: ['folder:Projects', 'Plan'],
    projects: ['folder:App', 'Spec'],
    app: ['Bugs'],
  },
  topLevel: ['Work'],
  counts: ['3', '2', '1'],
  loopRefused: { parent: null, can: false },
  sameNameRefused: true,
  sameNameElsewhere: true,
  pinItemHidden: true,
  subfolderPinned: false,
  outToTop: { parent: null, inWork: false },
  deleteMessage: /3/,
  afterDelete: { folders: ['Projects'], notes: [] },
};
