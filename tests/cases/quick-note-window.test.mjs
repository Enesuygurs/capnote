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
  // Lines marked while typing become lists, tasks, headings and quotes; with the setting off they
  // stay lines
  const marked = [
    '• milk',
    '- bread',
    '1. one',
    '2. two',
    '☐ call',
    '☑ paid',
    '# Plan',
    '> said',
    'plain',
  ].join('\n');
  const lists = a.quickNoteHtml(marked).replace(/ (id|for)="task_[^"]+"/g, '');
  a.settings.autoFormat = false;
  const plain = a.quickNoteHtml('- bread');
  a.settings.autoFormat = true;
  return { afterAdd, empty, opened, html: a.quickNoteHtml(''), lists, plain };
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
  lists:
    '<ul><li>milk</li><li>bread</li></ul><ol><li>one</li><li>two</li></ol>' +
    '<div class="checklist"><div class="checklist-item"><input type="checkbox"><label>call</label></div>' +
    '<div class="checklist-item"><input type="checkbox" checked><label>paid</label></div></div>' +
    '<h1>Plan</h1><blockquote>said</blockquote><p>plain</p>',
  plain: '<p>- bread</p>',
};
