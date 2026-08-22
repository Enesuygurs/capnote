// All, Favorites and Today filters show the right notes inside and outside folders

export async function run() {
  const a = window.app;
  const mk = (title, extra = {}) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = '<p>' + title + '</p>';
    a.saveNote(true);
    Object.assign(a.currentNote, extra);
    return a.currentNote;
  };
  a.folderNameInput.value = 'Projects';
  await a.createFolder();
  a.folderNameInput.value = 'Empty';
  await a.createFolder();
  const projects = a.folders.find((f) => f.name === 'Projects');
  mk('Root fav', { isFavorite: true });
  mk('Root old', { createdAt: '2020-01-01T00:00:00.000Z' });
  const f1 = mk('Alpha task', { isFavorite: true });
  await a.moveNoteToFolder(f1.id, projects.id);
  const f2 = mk('Beta task', { createdAt: '2020-01-01T00:00:00.000Z' });
  await a.moveNoteToFolder(f2.id, projects.id);
  const view = () => ({
    root: [...a.notesList.querySelectorAll('.note-item-title')].map((e) => e.textContent).sort(),
    folders: [...document.querySelectorAll('.folder-container')]
      .filter((c) => c.style.display !== 'none')
      .map(
        (c) =>
          c.querySelector('.nav-text').textContent +
          ':' +
          [...c.querySelectorAll('.folder-note-item .note-item-title')]
            .map((e) => e.textContent)
            .sort()
            .join('|')
      ),
    count: document.getElementById('navNotesCount').textContent,
  });
  const r = {};
  a.changeFilter('all');
  a.updateFoldersList();
  r.all = view();
  a.changeFilter('favorites');
  a.updateFoldersList();
  r.favorites = view();
  a.changeFilter('today');
  a.updateFoldersList();
  r.today = view();
  a.changeFilter('all');
  a.searchInput.value = 'beta';
  a.searchNotes();
  r.searchBeta = view();
  a.searchInput.value = 'projects';
  a.searchNotes();
  r.searchFolderName = view();
  a.updateSpecificFolder(projects.id);
  r.specificFolderSameAsFull = view();
  a.searchInput.value = '';
  a.searchNotes();
  return r;
}

export const expected = {
  all: {
    root: ['Root fav', 'Root old'],
    folders: ['Projects:Alpha task|Beta task', 'Empty:'],
    count: '4',
  },
  favorites: {
    root: ['Root fav'],
    folders: ['Projects:Alpha task'],
    count: '2',
  },
  today: {
    root: ['Root fav'],
    folders: ['Projects:Alpha task'],
    count: '2',
  },
  searchBeta: {
    root: [],
    folders: ['Projects:Beta task'],
    count: '1',
  },
  searchFolderName: {
    root: [],
    folders: ['Projects:Alpha task|Beta task'],
    count: '0',
  },
  specificFolderSameAsFull: {
    root: [],
    folders: ['Projects:Alpha task|Beta task'],
    count: '0',
  },
};
