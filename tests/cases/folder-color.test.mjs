// Changing a folder color from its context menu saves it; clicking the folder header collapses it

export async function run() {
  const a = window.app;
  const errors = [];
  window.addEventListener('error', (e) => errors.push(e.message));
  a.folderNameInput.value = 'Colors';
  await a.createFolder();
  const f = a.folders[0];
  const header = document.querySelector(`.folder-item[data-folder-id="${f.id}"]`);
  header.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 }));
  a.changeFolderColorMenuItem.click(); // opens modal; document click hides context menu
  document.body.click();
  a.folderColorInput.value = '#123456';
  a.saveFolderColorBtn.click();
  // collapse/expand still works without the removed nav-expandable handler
  header.click();
  const collapsed = !header.classList.contains('expanded');
  return { errors, color: a.folders[0].color, collapsed };
}

export const expected = {
  errors: [],
  color: '#123456',
  collapsed: true,
};
