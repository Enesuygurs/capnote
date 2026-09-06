// Every editor tool, used the way a click uses it (toolbar buttons must not take the caret):
// styles, date, lists, tasks, code blocks, tables, getting past blocks, emoji, paste, images,
// saving and reopening, previews

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ed = a.richEditor;
  const caretIn = (node, offset) => {
    const r = document.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    a.captureEditorSelection();
  };
  const selectText = (node) => {
    const r = document.createRange();
    r.selectNodeContents(node);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    a.captureEditorSelection();
  };
  const press = (el) => {
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    el.dispatchEvent(down);
    if (!down.defaultPrevented) el.focus();
    el.click();
  };
  const key = (k, extra = {}) => {
    const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra });
    ed.dispatchEvent(ev);
    return ev.defaultPrevented;
  };
  const type = (text) => document.execCommand('insertText', false, text);
  const caretBlock = () => a.topBlockOf(window.getSelection().getRangeAt(0).startContainer);
  const fresh = (html = '<p>hello world</p>') => {
    a.createNewNote();
    ed.innerHTML = html;
    ed.focus();
  };
  const clean = (html) => html.replace(/ id="task_[^"]+"| for="task_[^"]+"/g, '');
  const r = {};

  // Bold / italic / underline on a selection
  fresh();
  selectText(ed.querySelector('p').firstChild);
  press(document.querySelector('[data-format="bold"]'));
  press(document.querySelector('[data-format="italic"]'));
  press(document.querySelector('[data-format="underline"]'));
  r.styles = ed.innerHTML;

  // Date at the caret, not at the end
  fresh();
  caretIn(ed.querySelector('p').firstChild, 5);
  press(document.getElementById('insertDate'));
  r.dateInMiddle = ed.textContent.startsWith('hello') && ed.textContent.endsWith(' world');

  // Lists turn the line into a list item and back
  fresh();
  caretIn(ed.querySelector('p').firstChild, 5);
  press(document.getElementById('insertList'));
  r.bullet = ed.innerHTML;
  press(document.getElementById('insertList'));
  r.bulletOff = ed.innerHTML;
  press(document.getElementById('insertNumberedList'));
  r.numbered = ed.innerHTML;

  // Task: the line becomes a task; Enter makes the next one; Enter on an empty one leaves
  fresh();
  caretIn(ed.querySelector('p').firstChild, 11);
  press(document.getElementById('insertChecklist'));
  r.task = clean(ed.innerHTML);
  key('Enter');
  type('second');
  r.taskEnter = clean(ed.innerHTML);
  key('Enter');
  key('Enter');
  type('after');
  r.taskExit = clean(ed.innerHTML);
  // Clicking a task's text does not tick it
  const lbl = ed.querySelector('.checklist-item label');
  lbl.click();
  r.labelClickTicks = ed.querySelector('.checklist-item input').checked;

  // Code block on its own line, Enter adds lines, Enter on an empty last line leaves
  fresh();
  caretIn(ed.querySelector('p').firstChild, 11);
  press(document.getElementById('insertCodeBlockBtn'));
  type('const a = 1;');
  key('Enter');
  type('b();');
  key('Enter');
  key('Enter');
  type('below');
  r.code = ed.innerHTML.replace(/\u200B/g, '~');

  // Empty code block + Backspace removes it
  fresh('<p>x</p>');
  caretIn(ed.querySelector('p').firstChild, 1);
  press(document.getElementById('insertCodeBlockBtn'));
  key('Backspace');
  r.codeBackspace = ed.innerHTML.replace(/\u200B/g, '~');

  // Table: own line, a usable line below, Tab through cells, a new row after the last cell
  fresh();
  caretIn(ed.querySelector('p').firstChild, 11);
  press(document.getElementById('insertTableBtn'));
  await wait(50);
  a.tableRowsInput.value = '1';
  a.tableColsInput.value = '2';
  a.tableHeaderCheckbox.checked = false;
  a.handleInsertTable();
  type('c1');
  key('Tab');
  type('c2');
  key('Tab');
  type('c3');
  r.table = ed.innerHTML.replace(/ style="[^"]*"| class="[^"]*"| border="1"/g, '');

  // A note that ends with a block: ArrowDown and a click below reach a new line
  fresh('<p>top</p><pre><code>x</code></pre>');
  caretIn(ed.querySelector('code').firstChild, 1);
  key('ArrowDown');
  await wait(20);
  r.arrowBelowCode = caretBlock()?.tagName + ':' + ed.lastElementChild.tagName;
  fresh('<table><tbody><tr><td>t</td></tr></tbody></table>');
  caretIn(ed.querySelector('td').firstChild, 1);
  key('ArrowUp');
  await wait(20);
  r.arrowAboveTable = caretBlock()?.tagName + ':' + ed.firstElementChild.tagName;
  fresh('<ul><li>one</li></ul>');
  const box = ed.getBoundingClientRect();
  ed.dispatchEvent(
    new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: box.left + 20,
      clientY: box.bottom - 5,
    })
  );
  r.clickBelowList = caretBlock()?.tagName + ':' + ed.lastElementChild.tagName;

  // Alignment, colors
  fresh();
  caretIn(ed.querySelector('p').firstChild, 5);
  press(document.querySelector('[data-align="center"]'));
  r.center = ed.querySelector('p').style.textAlign;
  selectText(ed.querySelector('p').firstChild);
  a.applyFormat('color', '#ff0000');
  r.color = /ff0000|255, 0, 0/i.test(ed.innerHTML);

  // Enter on an empty list item leaves the list
  fresh();
  caretIn(ed.querySelector('p').firstChild, 11);
  press(document.getElementById('insertList'));
  key('Enter');
  if (!ed.querySelector('li + li')) document.execCommand('insertParagraph');
  key('Enter');
  type('out');
  r.listExit = ed.innerHTML;

  // Emoji goes in at the caret
  fresh();
  caretIn(ed.querySelector('p').firstChild, 5);
  a.toggleEmojiPanel();
  await wait(300);
  a.emojiGrid.querySelector('.emoji-grid-btn').click();
  r.emojiAtCaret = /^hello\S+ world$/u.test(ed.textContent);
  a.hideEmojiPanel();

  // Pasting text in a code block keeps it plain and in the block
  fresh('<pre><code>a</code></pre>');
  caretIn(ed.querySelector('code').firstChild, 1);
  const dt = new DataTransfer();
  dt.setData('text/plain', 'x\ny');
  ed.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
  );
  r.pasteInCode = ed.querySelector('code').textContent;

  // An image goes on the line and the caret continues after it
  fresh();
  caretIn(ed.querySelector('p').firstChild, 5);
  a.insertImageAtSelection('data:image/png;base64,iVBORw0KGgo=', 'i.png');
  type('!');
  r.image = ed.innerHTML.replace(
    /<span class="img-wrap"[\s\S]*?<\/span><\/span>|<span class="img-wrap"[\s\S]*?<\/span>/,
    '[img]'
  );

  // Saving and reopening keeps blocks as they are
  fresh(
    '<p>a</p><pre><code>l1\nl2</code></pre><div class="checklist"><div class="checklist-item"><input type="checkbox" id="t1"><label for="t1">t</label></div></div><ul><li>i</li></ul><p><br></p>'
  );
  a.noteTitle.value = 'Blocks';
  a.saveNote(true);
  const saved = a.currentNote;
  a.selectNote(saved);
  await a.editCurrentNote();
  r.reopened = [...ed.children]
    .map((c) => c.tagName + (c.className ? '.' + c.className : ''))
    .join(',');
  r.codeKeptLines = ed.querySelector('code').textContent;

  // Markdown and HTML previews leave the rich content unchanged
  const htmlBefore = ed.innerHTML;
  a.toggleMarkdownMode();
  a.toggleMarkdownMode();
  a.toggleHtmlMode();
  a.toggleHtmlMode();
  r.previewKeeps = ed.innerHTML === htmlBefore;

  a.cancelEdit();
  return r;
}

export const expected = {
  styles: '<p><b><i><u>hello world</u></i></b></p>',
  dateInMiddle: true,
  bullet: '<ul><li>hello world</li></ul>',
  bulletOff: '<p>hello world</p>',
  numbered: '<ol><li>hello world</li></ol>',
  task: '<div class="checklist"><div class="checklist-item"><input type="checkbox"><label>hello world</label></div></div><p><br></p>',
  taskEnter:
    '<div class="checklist"><div class="checklist-item"><input type="checkbox"><label>hello world</label></div><div class="checklist-item"><input type="checkbox"><label>second</label></div></div><p><br></p>',
  taskExit:
    '<div class="checklist"><div class="checklist-item"><input type="checkbox"><label>hello world</label></div><div class="checklist-item"><input type="checkbox"><label>second</label></div></div><p>after</p>',
  labelClickTicks: false,
  code: '<p>hello world</p><pre><code>const a = 1;\nb();</code></pre><p>below</p>',
  codeBackspace: '<p>x</p>',
  table:
    '<p>hello world</p><table><tbody><tr><td>c1</td><td>c2</td></tr><tr><td>c3</td><td><br></td></tr></tbody></table><p><br></p>',
  arrowBelowCode: 'P:P',
  arrowAboveTable: 'P:P',
  clickBelowList: 'P:P',
  center: 'center',
  color: true,
  listExit: '<ul><li>hello world</li></ul><p>out</p>',
  emojiAtCaret: true,
  pasteInCode: 'ax\ny',
  image: '<p>hello[img]! world</p>',
  reopened: 'P,PRE,DIV.checklist,UL,P',
  codeKeptLines: 'l1\nl2',
  previewKeeps: true,
};
