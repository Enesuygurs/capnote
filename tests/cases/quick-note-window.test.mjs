// The quick note window hands its note to the main window: saved, it is added without touching the
// note open in the editor; "open in the app" goes on with it as a new note in the editor

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // A note being written in the editor stays as it is
  a.createNewNote();
  a.noteTitle.value = 'Yazılıyor';
  a.richEditor.innerHTML = '<p>yarım</p>';
  const editing = a.currentNote.id;

  const added = a.addQuickNote({ title: '  Alışveriş ', text: 'Süt\r\nEkmek <b>\n\nYumurta\n\n' });
  const stored = (await window.electronAPI.storage.load()).data.notes.find(
    (n) => n.id === added.id
  );
  const afterAdd = {
    title: added.title,
    content: added.content,
    words: added.wordCount,
    history: added.history.map((h) => h.type),
    stored: !!stored,
    first: a.notes[0].id === added.id,
    listed: [...a.notesList.querySelectorAll('.note-item-title')].some(
      (e) => e.textContent === 'Alışveriş'
    ),
    stillEditing: a.currentNote.id === editing,
    editorTitle: a.noteTitle.value,
    editorText: a.richEditor.innerHTML,
    toast: document.querySelector('.notification')?.textContent.trim() || '',
  };
  const empty = a.addQuickNote({ title: ' ', text: '\n \n' });

  // Open in the app: a new note in the editor with the text, untitled when it has no title
  a.saveNote(true);
  const count = a.notes.length;
  a.openQuickNoteInApp({ title: '', text: 'Devamı burada' });
  await wait(100);
  const opened = {
    editorVisible: !a.noteEditor?.classList.contains('hidden'),
    isNew: a.currentNote.id !== editing && a.notes.length === count + 1,
    title: a.noteTitle.value,
    text: a.richEditor.innerHTML,
  };
  return { afterAdd, empty, opened, html: a.quickNoteHtml('') };
}

export const expected = {
  afterAdd: {
    title: 'Alışveriş',
    content: '<p>Süt</p><p>Ekmek &lt;b&gt;</p><p><br></p><p>Yumurta</p>',
    words: 4,
    history: ['created'],
    stored: true,
    first: true,
    listed: true,
    stillEditing: true,
    editorTitle: 'Yazılıyor',
    editorText: '<p>yarım</p>',
    toast: /Hızlı not eklendi/,
  },
  empty: null,
  opened: { editorVisible: true, isNew: true, title: '', text: '<p>Devamı burada</p>' },
  html: '',
};
