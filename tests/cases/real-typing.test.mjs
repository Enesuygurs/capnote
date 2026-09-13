// Typing with real key presses (through the same input path as a keyboard, not script events):
// a new note's lines are paragraphs, the line shortcuts convert, and Ctrl+Z / Ctrl+Y undo and redo
// in a new note and in a note being edited

export async function run() {
  const a = window.app;
  const keys = async (steps) => {
    window.__keysDone = false;
    console.log('__KEYS__:' + JSON.stringify(steps));
    for (let i = 0; i < 100 && !window.__keysDone; i++) await new Promise((r) => setTimeout(r, 50));
  };
  const html = () => a.richEditor.innerHTML.replace(/ (id|for)="task_[^"]+"/g, '');
  const r = {};

  a.createNewNote();
  a.richEditor.focus();
  await keys(['hello']);
  r.firstLine = html();
  await keys(['{Enter}', '# Title']);
  r.heading = html();
  await keys(['^z']);
  r.undoTyping = html();
  await keys(['^z']);
  r.undoShortcut = html();
  await keys(['^y']);
  r.redo = html();

  // The other shortcuts, each on a new line
  a.createNewNote();
  a.richEditor.focus();
  await keys(['- item', '{Enter}', '{Enter}', '[] task', '{Enter}', '{Enter}', '> said']);
  r.shortcuts = html();

  // Undo while editing a saved note
  a.noteTitle.value = 'Saved';
  a.saveNote(true);
  a.selectNote(a.currentNote);
  await a.editCurrentNote();
  a.placeCaretAtEnd(a.richEditor.lastElementChild);
  const before = html();
  await keys([' more']);
  const changed = html() !== before;
  await keys(['^z']);
  r.editUndo = changed && html() === before;
  a.cancelEdit();
  return r;
}

export const expected = {
  firstLine: '<p>hello</p>',
  heading: '<p>hello</p><h1>Title</h1>',
  undoTyping: '<p>hello</p><h1><br></h1>',
  undoShortcut: '<p>hello</p><p># </p>',
  redo: '<p>hello</p><h1><br></h1>',
  shortcuts:
    '<ul><li>item</li></ul><div class="checklist"><div class="checklist-item"><input type="checkbox"><label>task</label></div></div><blockquote>said</blockquote>',
  editUndo: true,
};
