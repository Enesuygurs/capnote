// "/" at the start of a line opens the command menu; typing narrows it, choosing a command puts it
// in place of "/…"; a "/" in the middle of a line does nothing

export async function run() {
  const a = window.app;
  const r = {};
  const typeIn = (html, text) => {
    a.createNewNote();
    a.richEditor.innerHTML = html;
    const line = a.richEditor.firstElementChild;
    const node = document.createTextNode(text);
    line.replaceChildren(node);
    a.placeCaret(node, text.length);
    a.updateSlashMenu();
  };
  const shown = () => !a.slashMenu.classList.contains('hidden');
  const first = () => a.slashMenu.querySelector('.menu-item')?.dataset.command || null;

  typeIn('<p><br></p>', '/');
  r.opens = shown();
  typeIn('<p><br></p>', '/gör');
  r.narrowed = first();
  a.chooseSlashCommand(a.slashChoices[0]);
  r.task = !!a.richEditor.querySelector('.checklist .checklist-item');
  r.slashGone = !a.richEditor.textContent.includes('/');

  typeIn('<p><br></p>', '/h2');
  a.chooseSlashCommand(a.slashChoices[0]);
  r.heading = a.richEditor.firstElementChild.tagName;

  typeIn('<p><br></p>', 'yarın / sonra');
  r.midLine = shown();

  typeIn('<p><br></p>', '/qqqqq');
  r.noMatchHidden = !shown();
  a.hideSlashMenu();
  return r;
}

export const expected = {
  opens: true,
  narrowed: 'task',
  task: true,
  slashGone: true,
  heading: 'H2',
  midLine: false,
  noMatchHidden: true,
};
