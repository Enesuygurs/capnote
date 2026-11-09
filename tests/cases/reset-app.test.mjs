// Resetting the app clears all data and settings, including the theme and accent

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'N';
  a.richEditor.innerHTML = '<p>n</p>';
  a.saveNote(true);
  // Tasks live in notes; an old to-do section is still cleared
  a.todoSections = [{ id: 't', name: 'T', todos: [] }];
  a.setAccentColor('#8b5cf6');
  a.toggleDarkMode(true);
  a.toggleEditorSidebar();
  a.languageSelect.value = 'en';
  a.languageSelect.dispatchEvent(new Event('change'));
  await a.clearAllContent();
  const stored = (await window.electronAPI.storage.load()).data;
  return {
    memory: [a.notes.length, a.todoSections.length],
    stored: [stored.notes.length, stored.todos.length, stored.folders.length],
    settings: {
      accent: stored.settings.accentColor,
      dark: stored.settings.darkMode,
      sidebar: stored.settings.editorSidebarVisible,
      language: stored.settings.language,
    },
    themeAttr: document.documentElement.getAttribute('data-theme'),
    inlineAccent: document.documentElement.style.getPropertyValue('--accent-color'),
    sidebarHidden: a.editorSidebar.classList.contains('hidden'),
    welcome: !a.welcomeScreen.classList.contains('hidden'),
  };
}

export const expected = {
  memory: [0, 0],
  stored: [0, 0, 0],
  settings: {
    accent: null,
    dark: false,
    sidebar: true,
    language: 'en',
  },
  themeAttr: null,
  inlineAccent: '#f59e0b',
  sidebarHidden: false,
  welcome: true,
};
