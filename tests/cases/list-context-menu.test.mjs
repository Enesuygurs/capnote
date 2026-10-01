// Right-click on an empty spot of the notes area opens a menu with "New note" and "Create folder";
// on a note or folder row their own menus open instead
export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Row';
  a.saveNote();
  const right = (el, x = 20, y = 400) =>
    el.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y })
    );
  const shown = (menu) => !menu.classList.contains('hidden');
  const r = {};

  right(a.sidebarContent);
  r.empty = {
    shown: shown(a.listContextMenu),
    items: [...a.listContextMenu.querySelectorAll('.menu-item span')].map((s) => s.textContent),
  };
  // On a note row: the note's menu, not this one
  right(a.notesList.querySelector('.note-item'));
  r.onNote = [shown(a.listContextMenu), shown(a.noteContextMenu)];
  a.hideNoteContextMenu();

  // New note
  right(a.sidebarContent);
  a.listContextMenu.querySelector('[data-action="newNote"]').click();
  r.newNote = [shown(a.listContextMenu), a.isEditorOpen(), a.noteTitle.value];
  a.cancelEdit();

  // Create folder: the folder dialog
  right(a.sidebarContent);
  a.listContextMenu.querySelector('[data-action="newFolder"]').click();
  r.newFolder = !a.folderModal.classList.contains('hidden');
  a.hideAllModals();

  // A click elsewhere closes it
  right(a.sidebarContent);
  document.body.click();
  r.closes = !shown(a.listContextMenu);
  r.buttonTitle = document.getElementById('addFolderBtn').title;
  return r;
}

export const expected = {
  empty: { shown: true, items: ['Yeni not', 'Klasör oluştur'] },
  onNote: [false, true],
  newNote: [false, true, ''],
  newFolder: true,
  closes: true,
  buttonTitle: 'Klasör Oluştur',
};
