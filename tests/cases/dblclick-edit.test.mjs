// A double-click anywhere in a note opens the editor: on its text with the caret where it was
// clicked, on a task too (ticked twice, it stays as it was)

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
  const taskEdits = a.isEditorOpen();
  a.finishEditing();

  await a.editAtPoint(pointIn(a.viewerText.querySelectorAll('p')[1]));
  const sel = window.getSelection();
  return {
    taskEdits,
    editorOpen: a.isEditorOpen(),
    caretLine: sel.anchorNode?.parentElement?.textContent,
  };
}

export const expected = {
  taskEdits: true,
  editorOpen: true,
  caretLine: 'İkinci satır',
};
