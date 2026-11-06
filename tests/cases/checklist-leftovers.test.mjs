// Deleting across tasks can leave a task without its checkbox or text, or an empty task list (as
// selecting everything in a note that starts with a task list and deleting does). Those leftovers
// become plain lines, so what is typed next is not caught in a half task; with nothing left the
// note is one empty line and the placeholder shows again, over that line.

export async function run() {
  const a = window.app;
  const ed = a.richEditor;
  // The placeholder follows the text through a MutationObserver, which runs a moment later
  const input = async () => {
    ed.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  const placeholder = () => ed.classList.contains('is-blank');
  const strip = (html) => html.replace(/ (id|for)="task_[^"]+"/g, '');
  const r = {};

  a.createNewNote();
  await new Promise((resolve) => setTimeout(resolve, 0));
  r.newNote = placeholder();

  // What select-all and delete leaves: a task shell, and the empty line below the list
  ed.innerHTML = '<div class="checklist"><div class="checklist-item"></div></div><p><br></p>';
  a.placeCaret(ed.querySelector('.checklist-item'), 0);
  await input();
  r.afterDelete = { html: ed.innerHTML, placeholder: placeholder() };

  // A task without its checkbox among others: it becomes a line, the others stay tasks
  ed.innerHTML = `<div class="checklist">${a.checklistItemHtml('one')}<div class="checklist-item">two</div>${a.checklistItemHtml('three')}</div>`;
  await input();
  r.middle = strip(ed.innerHTML);

  // Tasks that are whole are left alone
  ed.innerHTML = `<div class="checklist">${a.checklistItemHtml('ok')}</div><p>text</p>`;
  const before = ed.innerHTML;
  await input();
  r.untouched = ed.innerHTML === before;
  r.withText = placeholder();
  a.cancelEdit();
  return r;
}

export const expected = {
  newNote: true,
  afterDelete: { html: '<p><br></p>', placeholder: true },
  middle:
    '<div class="checklist"><div class="checklist-item"><input type="checkbox"><label>one</label></div></div>' +
    '<p>two</p>' +
    '<div class="checklist"><div class="checklist-item"><input type="checkbox"><label>three</label></div></div>',
  untouched: true,
  withText: false,
};
