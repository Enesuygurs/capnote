// Clicking beside a task's box (an empty task too) puts the caret in the task's text, with a real
// mouse click. An empty text keeps some width: at 0px wide Chromium draws no caret in it.
export async function run() {
  const a = window.app;
  const steps = async (list) => {
    window.__keysDone = false;
    console.log('__KEYS__:' + JSON.stringify(list));
    for (let i = 0; i < 100 && !window.__keysDone; i++) await new Promise((r) => setTimeout(r, 50));
  };
  const caret = () => {
    const sel = window.getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    const label = range.startContainer.closest
      ? range.startContainer.closest('label')
      : range.startContainer.parentElement.closest('label');
    return {
      inLabel: !!label,
      hasWidth: !!label && label.getBoundingClientRect().width > 0,
      focused: document.activeElement === a.richEditor,
    };
  };
  a.createNoteFromTemplate('weekly');
  const box = a.richEditor.querySelector('.checklist-item input');
  const r = box.getBoundingClientRect();
  const y = Math.round(r.top + r.height / 2);
  const r1 = {};
  // Just right of the box, where the empty text would be
  await steps([{ click: [Math.round(r.right + 30), y] }]);
  r1.besideBox = caret();
  await steps(['milk']);
  r1.typed = box.closest('.checklist-item').querySelector('label').textContent;
  // Far right of a task with text: the caret goes to the end of its text
  await steps([{ click: [Math.round(r.right + 300), y] }, '!']);
  r1.atEnd = box.closest('.checklist-item').querySelector('label').textContent;
  r1.ticked = box.checked;
  return r1;
}

export const expected = {
  besideBox: { inLabel: true, hasWidth: true, focused: true },
  typed: 'milk',
  atEnd: 'milk!',
  ticked: false,
};
