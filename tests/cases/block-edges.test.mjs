// Backspace and Delete at the edge of a block. A divider made with "---" and Enter vanished with one
// Backspace; a heading or quote joined to a line copied its look into the text as inline styles.
// Now a divider, code block or table is selected by the first press and deleted by the second,
// and joining lines moves only the text.

export async function run() {
  const a = window.app;
  const ed = a.richEditor;
  a.createNewNote();
  const key = (k) => {
    const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    ed.dispatchEvent(e);
    return e.defaultPrevented;
  };
  const caret = (node, offset) => {
    const r = document.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  };
  const load = (html) => {
    ed.innerHTML = html;
    a.resetEditorHistory();
    ed.focus();
  };
  const r = {};

  // Divider: first Backspace selects it, the second deletes it, undo brings it back
  load('<p>Önce</p><hr><p><br></p>');
  caret(ed.lastElementChild, 0);
  key('Backspace');
  r.divider = {
    keptAfterOne: !!ed.querySelector('hr'),
    selected: !a.blockSelectionMark.hidden,
  };
  key('Backspace');
  r.divider.goneAfterTwo = !ed.querySelector('hr');
  a.undoEditor();
  r.divider.undo = !!ed.querySelector('hr');

  // The same for a code block and a table, from a quote and from a list item
  load('<pre><code>kod</code></pre><blockquote>alıntı</blockquote>');
  caret(ed.querySelector('blockquote').firstChild, 0);
  key('Backspace');
  r.codeKept = !!ed.querySelector('pre');
  load('<ul><li>madde</li></ul><table><tbody><tr><td>h</td></tr></tbody></table>');
  caret(ed.querySelector('li').firstChild, 5);
  key('Delete');
  r.tableKept = !!ed.querySelector('table');

  // Joining a heading and a line moves only the text
  load('<p>Önce</p><h2>başlık</h2>');
  caret(ed.firstElementChild.firstChild, 4);
  key('Delete');
  r.headingJoin = ed.innerHTML;
  load(
    '<div class="checklist"><div class="checklist-item"><input type="checkbox" id="q"><label for="q">görev</label></div></div><blockquote>alıntı</blockquote>'
  );
  caret(ed.querySelector('blockquote').firstChild, 0);
  key('Backspace');
  r.quoteIntoTask = {
    label: ed.querySelector('.checklist-item label')?.textContent,
    styled: ed.querySelectorAll('span[style]').length,
    quote: !!ed.querySelector('blockquote'),
  };
  a.cancelEdit();
  return r;
}

export const expected = {
  divider: { keptAfterOne: true, selected: true, goneAfterTwo: true, undo: true },
  codeKept: true,
  tableKept: true,
  headingJoin: '<p>Öncebaşlık</p>',
  quoteIntoTask: { label: 'görevalıntı', styled: 0, quote: false },
};
