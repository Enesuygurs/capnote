// The text style list, strikethrough, quote, divider and links, and the shortcuts typed at the
// start of a line: "# " headings, "- " / "1. " lists, "[] " tasks, "> " quotes, "```" code
// blocks and "---" dividers. Each conversion can be undone with Ctrl+Z.

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ed = a.richEditor;
  const caretIn = (node, offset) => {
    const r = document.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    a.captureEditorSelection();
  };
  const selectText = (node) => {
    const r = document.createRange();
    r.selectNodeContents(node);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    a.captureEditorSelection();
  };
  const press = (el) => {
    const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    el.dispatchEvent(down);
    if (!down.defaultPrevented) el.focus();
    el.click();
  };
  const typeChars = (text) =>
    [...text].forEach((c) => document.execCommand('insertText', false, c));
  const key = (k, extra = {}) =>
    ed.dispatchEvent(
      new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra })
    );
  const fresh = (html = '<p>hello world</p>') => {
    a.createNewNote();
    ed.innerHTML = html;
    ed.focus();
    a.resetEditorHistory();
  };
  const clean = (html) => html.replace(/ (id|for)="task_[^"]+"/g, '').replace(/\u200B/g, '~');
  const r = {};

  // Text style list
  fresh();
  caretIn(ed.querySelector('p').firstChild, 3);
  document.querySelector('#blockStyle .select-selected').click();
  document.querySelector('#blockStyle .select-item[data-value="h2"]').click();
  r.heading = ed.innerHTML;
  r.styleLabel = document.querySelector('#blockStyle .select-selected').textContent.trim();
  document.querySelector('#blockStyle .select-selected').click();
  document.querySelector('#blockStyle .select-item[data-value="p"]').click();
  r.backToText = ed.innerHTML;

  // Strikethrough
  fresh();
  selectText(ed.querySelector('p').firstChild);
  press(document.querySelector('[data-format="strikeThrough"]'));
  r.strike = ed.innerHTML;

  // Quote on and off
  fresh();
  caretIn(ed.querySelector('p').firstChild, 3);
  press(a.insertQuoteBtn);
  r.quote = ed.innerHTML;
  press(a.insertQuoteBtn);
  r.unquote = ed.innerHTML;

  // Divider
  fresh();
  caretIn(ed.querySelector('p').firstChild, 11);
  press(a.insertDividerBtn);
  r.divider = ed.innerHTML;

  // Link: new from a selection, then edited, then removed
  fresh();
  selectText(ed.querySelector('p').firstChild);
  press(a.insertLinkBtn);
  await wait(80);
  a.linkUrlInput.value = 'example.com';
  a.applyLinkBtn.click();
  r.link = ed.innerHTML;
  caretIn(ed.querySelector('a').firstChild, 2);
  press(a.insertLinkBtn);
  await wait(80);
  r.linkEditFill = [
    a.linkTextInput.value,
    a.linkUrlInput.value,
    a.removeLinkBtn.classList.contains('hidden'),
  ];
  a.removeLinkBtn.click();
  r.unlink = ed.innerHTML;
  r.badAddress = a.normalizeLinkUrl('not a link');
  r.mail = a.normalizeLinkUrl('me@example.com');

  // Shortcuts typed at the start of a line
  const shortcut = async (typed, extra = '') => {
    fresh('<p><br></p>');
    caretIn(ed.querySelector('p'), 0);
    typeChars(typed);
    typeChars(extra);
    return clean(ed.innerHTML);
  };
  r.typedH1 = await shortcut('# ', 'Title');
  r.typedH3 = await shortcut('### ', 'Small');
  r.typedBullet = await shortcut('- ', 'item');
  r.typedNumber = await shortcut('1. ', 'first');
  r.typedTask = await shortcut('[] ', 'todo');
  r.typedDone = await shortcut('[x] ', 'done');
  r.typedQuote = await shortcut('> ', 'said');
  r.typedCode = await shortcut('```', 'x = 1');
  fresh('<p><br></p>');
  caretIn(ed.querySelector('p'), 0);
  typeChars('---');
  key('Enter');
  typeChars('after');
  r.typedDivider = ed.innerHTML;
  // Mid-line text is left alone
  r.notAtStart = await shortcut('a ', '# b');

  // Undo returns the typed characters
  fresh('<p><br></p>');
  caretIn(ed.querySelector('p'), 0);
  typeChars('## ');
  const converted = ed.innerHTML;
  key('z', { ctrlKey: true });
  r.undoShortcut = [converted, ed.innerHTML.replace(/&nbsp;/g, ' ')];

  a.cancelEdit();
  return r;
}

export const expected = {
  heading: '<h2>hello world</h2>',
  styleLabel: 'Başlık 2',
  backToText: '<p>hello world</p>',
  strike: '<p><strike>hello world</strike></p>',
  quote: '<blockquote>hello world</blockquote>',
  unquote: '<p>hello world</p>',
  divider: '<p>hello world</p><hr><p><br></p>',
  link: '<p><a href="https://example.com">hello world</a></p>',
  linkEditFill: ['hello world', 'https://example.com', false],
  unlink: '<p>hello world</p>',
  badAddress: null,
  mail: 'mailto:me@example.com',
  typedH1: '<h1>Title</h1>',
  typedH3: '<h3>Small</h3>',
  typedBullet: '<ul><li>item</li></ul>',
  typedNumber: '<ol><li>first</li></ol>',
  typedTask:
    '<div class="checklist"><div class="checklist-item"><input type="checkbox"><label>todo</label></div></div><p><br></p>',
  typedDone:
    '<div class="checklist"><div class="checklist-item"><input type="checkbox" checked="checked"><label>done</label></div></div><p><br></p>',
  typedQuote: '<blockquote>said</blockquote>',
  typedCode: '<pre><code>~x = 1</code></pre><p><br></p>',
  typedDivider: '<hr><p>after</p>',
  notAtStart: '<p>a # b</p>',
  undoShortcut: ['<h2><br></h2>', '<p>## </p>'],
};
