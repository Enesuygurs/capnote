// The emoji panel lists, filters by English keywords, switches categories and inserts emoji

export async function run() {
  const a = window.app;
  await a.editCurrentNote?.();
  a.createNewNote();
  const all = a.emojiGrid.children.length;
  a.filterEmojiGrid('pizza');
  const pizzaVisible = [...a.emojiGrid.children]
    .filter((b) => b.style.display !== 'none')
    .map((b) => b.textContent);
  a.filterEmojiGrid('happy');
  const happy = [...a.emojiGrid.children]
    .filter((b) => b.style.display !== 'none')
    .map((b) => b.textContent);
  a.filterEmojiGrid('');
  document.querySelector('.emoji-tab[data-category="flags"]').click();
  const flags = a.emojiGrid.children.length;
  document.querySelector('.emoji-tab[data-category="all"]').click();
  a.richEditor.focus();
  a.emojiGrid.children[0].click();
  return { all, flags, pizzaVisible, happy, inserted: a.richEditor.textContent };
}

export const expected = {
  all: 400,
  flags: 24,
  pizzaVisible: [],
  happy: ['😊'],
  inserted: '😀',
};
