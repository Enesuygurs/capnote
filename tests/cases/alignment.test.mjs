// Aligning a task or a list item moves the whole line: the box, bullet or number stays right
// next to the text, in the editor and in the viewer

export async function run() {
  const a = window.app;
  const ed = a.richEditor;
  const caretIn = (node, offset) => {
    const r = document.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
    a.captureEditorSelection();
  };
  const textRect = (node) => {
    const r = document.createRange();
    r.selectNodeContents(node);
    return r.getBoundingClientRect();
  };
  const align = (html, how) => {
    a.createNewNote();
    ed.innerHTML = html;
    ed.focus();
    const label = ed.querySelector('label, li');
    caretIn(label.firstChild, 2);
    a.applyAlignment(how);
    return label;
  };

  // Task: the box sits right before the text
  const label = align(
    '<div class="checklist"><div class="checklist-item"><input type="checkbox" id="t"><label for="t">Task text</label></div></div>',
    'center'
  );
  const box = ed.querySelector('input').getBoundingClientRect();
  const taskGap = Math.round(textRect(label.firstChild).left - box.right);
  const edBox = ed.getBoundingClientRect();
  const taskCentered =
    Math.abs((box.left + textRect(label.firstChild).right) / 2 - (edBox.left + edBox.width / 2)) <
    4;

  // List item: the bullet goes with the text
  const li = align('<ul><li>Bullet text</li></ul>', 'right');
  const bulletInside = getComputedStyle(li).listStylePosition;
  const textRight = Math.round(edBox.right - textRect(li.firstChild).right);

  // The viewer shows the same
  a.noteTitle.value = 'Aligned';
  ed.innerHTML =
    '<div class="checklist"><div class="checklist-item"><input type="checkbox" id="v"><label for="v" style="text-align: center;">Viewer task</label></div></div>';
  a.saveNote(true);
  a.selectNote(a.currentNote);
  const viewerItem = a.viewerText.querySelector('.checklist-item');
  const viewerJustify = getComputedStyle(viewerItem).justifyContent;

  return { taskGap, taskCentered, bulletInside, textRight, viewerJustify };
}

export const expected = {
  taskGap: 8,
  taskCentered: true,
  bulletInside: 'inside',
  textRight: 0,
  viewerJustify: 'center',
};
