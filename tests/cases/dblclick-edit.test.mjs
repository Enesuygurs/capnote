// A double-click on a note's text opens the editor with the caret where it was clicked; not on a
// task's text (a click there ticks the task)

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Not';
  a.richEditor.innerHTML =
    '<p>Birinci satır</p><p>İkinci satır</p><div class="checklist">' +
    a.checklistItemHtml('Görev') +
    '</div>';
  a.saveNote(true);
  a.selectNote(a.currentNote);
  const pointIn = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el.firstChild);
    const box = r.getBoundingClientRect();
    return { clientX: box.right - 1, clientY: box.top + box.height / 2, target: el };
  };
  const task = a.viewerText.querySelector('.checklist-item label');
  await a.editAtPoint(pointIn(task));
  const taskStays = !a.isEditorOpen();

  await a.editAtPoint(pointIn(a.viewerText.querySelectorAll('p')[1]));
  const sel = window.getSelection();
  return {
    taskStays,
    editorOpen: a.isEditorOpen(),
    caretLine: sel.anchorNode?.parentElement?.textContent,
  };
}

export const expected = {
  taskStays: true,
  editorOpen: true,
  caretLine: 'İkinci satır',
};
