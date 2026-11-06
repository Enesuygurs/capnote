// Ctrl+X with nothing selected cuts the line the caret is on: a paragraph, one list item or task
// (a list left empty goes too), one line of a code block (by the browser's own cut, on the line it
// selects); in a table nothing happens. The plain text editor selects the line for the browser's
// cut. "New note" in a folder's menu makes the note in that folder and opens the folder.
// The clipboard is not touched here: the copy is recorded instead.

export async function run() {
  const a = window.app;
  const ed = a.richEditor;
  const copied = [];
  const realExec = document.execCommand.bind(document);
  document.execCommand = (command, ...rest) => {
    if (command === 'copy') {
      copied.push(window.getSelection().toString());
      return true;
    }
    return realExec(command, ...rest);
  };
  const ctrlX = (target) =>
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', ctrlKey: true, bubbles: true, cancelable: true })
    );
  const strip = (html) => html.replace(/ (id|for)="task_[^"]+"/g, '');
  const caretText = () => {
    const sel = window.getSelection();
    return (sel.anchorNode?.textContent || '') + '@' + sel.anchorOffset;
  };
  const r = {};

  a.createNewNote();
  // A paragraph in the middle: gone, the caret at the start of the next line
  ed.innerHTML = '<p>one</p><p>two</p><p>three</p>';
  a.placeCaret(ed.children[1].firstChild, 1);
  ctrlX(ed);
  r.paragraph = { html: ed.innerHTML, copied: copied.pop(), caret: caretText() };

  // A list item; the last one takes the list with it
  ed.innerHTML = '<ul><li>a</li><li>b</li></ul><p>end</p>';
  a.placeCaret(ed.querySelector('li:last-child').firstChild, 0);
  ctrlX(ed);
  r.listItem = ed.innerHTML;
  a.placeCaret(ed.querySelector('li').firstChild, 0);
  ctrlX(ed);
  r.lastItem = { html: ed.innerHTML, caret: caretText() };

  // A task
  ed.innerHTML = `<div class="checklist">${a.checklistItemHtml('first')}${a.checklistItemHtml('second')}</div>`;
  a.placeCaret(ed.querySelector('.checklist-item label').firstChild, 2);
  ctrlX(ed);
  r.task = { html: strip(ed.innerHTML), copied: copied.pop() };

  // The only line: the note is one empty line
  ed.innerHTML = '<p>only</p>';
  a.placeCaret(ed.firstChild.firstChild, 2);
  ctrlX(ed);
  r.onlyLine = ed.innerHTML;

  // A code block: its line is selected for the browser's cut
  ed.innerHTML = '<pre><code>let a = 1;\nlet b = 2;\nlet c = 3;</code></pre>';
  a.placeCaret(ed.querySelector('code').firstChild, 14);
  ctrlX(ed);
  r.codeSelection = window.getSelection().toString();

  // In a table: nothing
  ed.innerHTML = '<table><tbody><tr><td>cell</td></tr></tbody></table>';
  a.placeCaret(ed.querySelector('td').firstChild, 1);
  const before = ed.innerHTML;
  ctrlX(ed);
  r.table = ed.innerHTML === before;

  // With a selection, Ctrl+X is the ordinary cut (left to the browser)
  ed.innerHTML = '<p>keep this</p>';
  const range = document.createRange();
  range.setStart(ed.firstChild.firstChild, 0);
  range.setEnd(ed.firstChild.firstChild, 4);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  ctrlX(ed);
  r.selection = ed.innerHTML;
  a.cancelEdit();

  // The plain text editor: the line with its break is selected
  const md = a.markdownEditor;
  md.value = 'first\nsecond\nthird';
  md.setSelectionRange(8, 8);
  ctrlX(md);
  r.markdown = md.value.slice(md.selectionStart, md.selectionEnd);
  md.setSelectionRange(16, 16);
  ctrlX(md);
  r.markdownLast = md.value.slice(md.selectionStart, md.selectionEnd);
  document.execCommand = realExec;

  // "New note" in a folder's menu
  a.folders.push({ id: 'box', name: 'Box', createdAt: new Date().toISOString(), expanded: false });
  a.updateFoldersList();
  a.showFolderContextMenu(10, 10, 'box');
  document.getElementById('newNoteInFolderMenuItem').click();
  await new Promise((resolve) => setTimeout(resolve, 50));
  r.folderNote = {
    folder: a.currentNote.folderId,
    editing: a.isEditorOpen(),
    folderOpen: a.folders.find((f) => f.id === 'box').expanded,
    inFolder: !!document.querySelector(
      `.folder-notes-container[data-folder-id="box"] .note-item[data-note-id="${a.currentNote.id}"]`
    ),
  };
  return r;
}

export const expected = {
  paragraph: { html: '<p>one</p><p>three</p>', copied: 'two', caret: 'three@0' },
  listItem: '<ul><li>a</li></ul><p>end</p>',
  lastItem: { html: '<p>end</p>', caret: 'end@0' },
  task: {
    html: '<div class="checklist"><div class="checklist-item"><input type="checkbox"><label>second</label></div></div>',
    copied: 'first',
  },
  onlyLine: '<p><br></p>',
  codeSelection: 'let b = 2;\n',
  table: true,
  selection: '<p>keep this</p>',
  markdown: 'second\n',
  markdownLast: '\nthird',
  folderNote: { folder: 'box', editing: true, folderOpen: true, inFolder: true },
};
