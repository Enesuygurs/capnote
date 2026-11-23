// A double-click on a folder's name renames it in place (on its arrow it does not)

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Folder rename
  a.folders.push({ id: 'fr', name: 'Old', color: '#3b82f6', expanded: true });
  a.updateFoldersList();
  const header = () => document.querySelector('.folder-item[data-folder-id="fr"]');
  // A double-click at the middle of an element, or of its text
  const dblclickAt = (el, onText) => {
    let rect = el.getBoundingClientRect();
    if (onText) {
      const range = document.createRange();
      range.selectNodeContents(el);
      rect = range.getBoundingClientRect();
    }
    el.dispatchEvent(
      new MouseEvent('dblclick', {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      })
    );
  };
  dblclickAt(header().querySelector('.nav-expand'));
  const arrowRenames = !!header().querySelector('.note-rename-input');
  dblclickAt(header().querySelector('.nav-text'), true);
  const input = header().querySelector('.note-rename-input');
  input.value = 'New name';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await wait(50);
  const renamed = a.folders.find((f) => f.id === 'fr').name;
  const shown = header().querySelector('.nav-text').textContent;

  return { arrowRenames, renamed, shown };
}

export const expected = {
  arrowRenames: false,
  renamed: 'New name',
  shown: 'New name',
};
