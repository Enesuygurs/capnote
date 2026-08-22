// Enter stays inside a code block, Ctrl+Enter leaves it, and pasting keeps plain text

export async function run() {
  const a = window.app;
  const key = (k, opts = {}) =>
    a.richEditor.dispatchEvent(
      new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts })
    );
  const caretAt = (node, offset) => {
    const r = document.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
  };
  a.createNewNote();
  a.richEditor.focus();
  a.richEditor.innerHTML = '<pre><code>let x = 1;</code></pre>';
  const text = a.richEditor.querySelector('code').firstChild;
  caretAt(text, text.length);
  key('Enter');
  const afterEnter = JSON.stringify(a.richEditor.querySelector('code').textContent);
  key('Enter', { ctrlKey: true });
  const exited = a.richEditor.lastElementChild.tagName;
  a.richEditor.innerHTML =
    '<div class="checklist"><div class="checklist-item"><input type="checkbox"><label>one</label></div></div>';
  caretAt(a.richEditor.querySelector('label').firstChild, 3);
  key('Enter');
  const afterChecklist = a.richEditor.innerHTML;
  a.richEditor.innerHTML = '<pre><code>a</code></pre>';
  caretAt(a.richEditor.querySelector('code').firstChild, 1);
  const dt = new DataTransfer();
  dt.setData('text/plain', 'b\nc');
  a.richEditor.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
  );
  return {
    afterEnter,
    exited,
    afterChecklist,
    pasted: JSON.stringify(a.richEditor.querySelector('code').textContent),
  };
}

export const expected = {
  afterEnter: '"let x = 1;\\n​"',
  exited: 'P',
  afterChecklist:
    '<div class="checklist"><div class="checklist-item"><input type="checkbox"><label>one</label></div></div><p><br></p>',
  pasted: '"ab\\nc"',
};
