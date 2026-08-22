// Resetting the app clears all data and settings, including the theme and accent

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'N';
  a.richEditor.innerHTML = '<p>n</p>';
  a.saveNote(true);
  a.todoSectionInput.value = 'T';
  a.addTodoSection();
  a.setAccentColor('#8b5cf6');
  a.toggleDarkMode(true);
  a.setSetting('maxPinnedNotes', 7);
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
      maxPinned: stored.settings.maxPinnedNotes,
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
    maxPinned: 3,
    sidebar: true,
    language: 'en',
  },
  themeAttr: null,
  inlineAccent: '#f59e0b',
  sidebarHidden: false,
  welcome: true,
};
