// The label of the unfiled drop zone is translated

export async function run() {
  const a = window.app;
  const c =
    document.getElementById('notesListContainer') ||
    document.querySelector('.notes-list-container');
  const dt = new DataTransfer();
  dt.setData('text/plain', 'x');
  c.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
  const tr = getComputedStyle(c, '::before').content;
  a.languageSelect.value = 'en';
  a.languageSelect.dispatchEvent(new Event('change'));
  await new Promise((r) => setTimeout(r, 200));
  c.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
  return {
    tr,
    en: getComputedStyle(c, '::before').content,
    dragOver: c.classList.contains('drag-over'),
  };
}

export const expected = {
  tr: '"Notu klasörden çıkarmak için buraya bırakın"',
  en: '"Drop here to take the note out of its folder"',
  dragOver: true,
};
