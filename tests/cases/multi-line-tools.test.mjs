// Tools used on several selected lines: each line converts on its own, nothing is lost or merged.
// A bulleted list of six items turned into a task list once lost every line but one checkbox; a
// divider or a code block deleted the selection; a highlight across list items split them.

export async function run() {
  const a = window.app;
  const ed = a.richEditor;
  a.createNewNote();
  const items = (tag) =>
    `<${tag}>${[1, 2, 3, 4, 5, 6].map((i) => `<li>Madde ${i}</li>`).join('')}</${tag}>`;
  const textNode = (text) => {
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.data.includes(text)) return n;
    return null;
  };
  const select = (fromText, fromOffset, toText, toOffset) => {
    const r = document.createRange();
    r.setStart(textNode(fromText), fromOffset);
    r.setEnd(textNode(toText), toOffset);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    a.captureEditorSelection();
  };
  const load = (html) => {
    ed.innerHTML = html;
    a.resetEditorHistory();
    ed.focus();
  };
  const tasks = () => [...ed.querySelectorAll('.checklist-item label')].map((l) => l.textContent);
  const r = {};

  // Six bullets, all selected, to a task list: six tasks
  load(items('ul'));
  select('Madde 1', 0, 'Madde 6', 7);
  document.getElementById('insertChecklist').click();
  r.bulletsToTasks = { tasks: tasks(), boxes: ed.querySelectorAll('input[type=checkbox]').length };
  // The same button again: six bullets? No: six plain lines
  document.getElementById('insertChecklist').click();
  r.tasksBackToLines = [...ed.querySelectorAll('p')].map((p) => p.textContent).filter(Boolean);

  // Six lines of one paragraph (line breaks) to a task list: six tasks, not one
  load(`<p>${[1, 2, 3, 4, 5, 6].map((i) => `Satır ${i}`).join('<br>')}</p>`);
  select('Satır 1', 0, 'Satır 6', 7);
  document.getElementById('insertChecklist').click();
  r.brLinesToTasks = tasks();

  // Two lines in the middle of a numbered list to bullets: only they change
  load(items('ol'));
  select('Madde 2', 2, 'Madde 3', 2);
  document.getElementById('insertList').click();
  r.middleOnly = [...ed.children]
    .filter((el) => el.matches('ul, ol'))
    .map((list) => `${list.tagName}:${list.children.length}`);

  // Undo puts the list back as it was
  a.undoEditor();
  r.undo = ed.querySelectorAll('ol > li').length;

  // A code block from selected lines: the lines go into it, each on its own row
  load('<p>a1</p><p>a2</p><p>a3</p>');
  select('a1', 0, 'a2', 2);
  document.getElementById('insertCodeBlockBtn').click();
  r.codeBlock = {
    code: ed.querySelector('pre code')?.textContent,
    rest: ed.textContent.includes('a3'),
  };

  // A divider never deletes text: it goes below the line
  load('<p>b1</p><p>b2</p>');
  select('b1', 0, 'b1', 2);
  document.getElementById('insertDividerBtn').click();
  r.divider = [...ed.children].map((el) => el.tagName + ':' + el.textContent).slice(0, 3);

  // A highlight across list items keeps the items
  load(items('ul'));
  select('Madde 2', 2, 'Madde 4', 3);
  a.applyFormat('backgroundColor', '#fde047');
  r.highlight = {
    items: ed.querySelectorAll('li').length,
    texts: [...ed.querySelectorAll('li')].map((li) => li.textContent).join('|'),
    marked: ed.querySelectorAll('li span[style*="background"]').length,
  };
  a.cancelEdit();
  return r;
}

export const expected = {
  bulletsToTasks: {
    tasks: ['Madde 1', 'Madde 2', 'Madde 3', 'Madde 4', 'Madde 5', 'Madde 6'],
    boxes: 6,
  },
  tasksBackToLines: ['Madde 1', 'Madde 2', 'Madde 3', 'Madde 4', 'Madde 5', 'Madde 6'],
  brLinesToTasks: ['Satır 1', 'Satır 2', 'Satır 3', 'Satır 4', 'Satır 5', 'Satır 6'],
  middleOnly: ['OL:1', 'UL:2', 'OL:3'],
  undo: 6,
  codeBlock: { code: 'a1\na2', rest: true },
  divider: ['P:b1', 'HR:', 'P:b2'],
  highlight: { items: 6, texts: 'Madde 1|Madde 2|Madde 3|Madde 4|Madde 5|Madde 6', marked: 3 },
};
