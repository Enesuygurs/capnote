// Ctrl+click selects notes and folders, the selection menu deletes them together (folders with
// their notes), a double-click renames a note in place, folders open with an animation

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
  const one = make('One');
  const two = make('Two');
  const three = make('Three');
  const inside = make('Inside');
  a.folders.push({ id: 'fs', name: 'Box', color: '#3b82f6', expanded: true });
  inside.folderId = 'fs';
  a.selectNote(three);
  a.updateNotesList();
  a.updateFoldersList();

  const row = (id) => document.querySelector(`.note-item[data-note-id="${id}"]`);
  const ctrlClick = (el) =>
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
  ctrlClick(row(one.id));
  ctrlClick(document.querySelector('.folder-item[data-folder-id="fs"]'));
  const selected = [...document.querySelectorAll('.is-selected')].length;

  // Right-click on a selected row opens the selection menu
  row(one.id).dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 50, clientY: 200 })
  );
  const menuOpen = !a.selectionMenu.classList.contains('hidden');
  const deleteLabel = a.selectionMenu.querySelector('[data-action="delete"] span').textContent;
  a.selectionMenu.querySelector('[data-action="delete"]').click();
  a.confirmBtn.click();
  await wait(50);
  const left = a.notes.map((n) => n.title).sort();
  const folders = a.folders.length;

  // Double-click renames in place
  a.showWelcome();
  row(two.id).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  const input = document.querySelector('.note-rename-input');
  input.value = 'Renamed';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await wait(50);
  const renamed = two.title;

  // A folder closes with a transition and ends hidden
  a.folders.push({ id: 'fa', name: 'Anim', color: '#3b82f6', expanded: true });
  two.folderId = 'fa';
  a.updateFoldersList();
  const header = document.querySelector('.folder-item[data-folder-id="fa"]');
  const body = document.querySelector('.folder-notes-container[data-folder-id="fa"]');
  header.click();
  const animating = body.style.transition.includes('height');
  await wait(300);
  const closed = body.style.display === 'none';

  return { selected, menuOpen, deleteLabel, left, folders, renamed, animating, closed };
}

export const expected = {
  selected: 3,
  menuOpen: true,
  deleteLabel: 'Seçilenleri sil (3)',
  left: ['Two'],
  folders: 0,
  renamed: 'Renamed',
  animating: true,
  closed: true,
};
