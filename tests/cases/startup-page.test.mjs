// The page chosen in "Page on start" is what the app shows after a restart

export async function seed() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Last';
  a.richEditor.innerHTML = '<p>x</p>';
  a.saveNote(true);
  a.startupPageSelect.value = 'todos';
  a.startupPageSelect.dispatchEvent(new Event('change'));
  await new Promise((r) => setTimeout(r, 300));
  return 'seeded';
}

export async function run() {
  const a = window.app;
  const visible = (el) => !el.classList.contains('hidden');
  return {
    setting: a.settings.startupPage,
    selectShows: a.startupPageSelect.value,
    todos: visible(a.todosScreen),
    viewer: visible(a.noteViewer),
  };
}

export const expected = {
  setting: 'todos',
  selectShows: 'todos',
  todos: true,
  viewer: false,
};
