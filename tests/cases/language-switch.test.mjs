// Switching the language updates dates, counts and menus

export async function run() {
  const a = window.app;
  const errors = [];
  window.addEventListener('error', (e) => errors.push(e.message));
  a.createNewNote();
  a.noteTitle.value = 'Lang';
  a.richEditor.innerHTML = '<p>hello world</p>';
  a.saveNote();
  const before = a.lastModified.textContent;
  a.languageSelect.value = 'en';
  a.languageSelect.dispatchEvent(new Event('change'));
  await new Promise((r) => setTimeout(r, 50));
  return {
    errors,
    before,
    after: a.lastModified.textContent,
    words: a.viewerWordCount.textContent,
    menuLabel: (() => {
      a.showNoteContextMenu(10, 10, a.currentNote.id);
      const text = document.querySelector(
        '#noteContextMenu [data-action="favorite"] span'
      ).textContent;
      a.hideNoteContextMenu();
      return text;
    })(),
  };
}

export const expected = {
  errors: [],
  before: /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/,
  after: /^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2} [AP]M$/,
  words: '2 words',
  menuLabel: 'Add to favorites',
};
