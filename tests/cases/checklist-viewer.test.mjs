// Ticking a box in the viewer saves it, without storing the code copy buttons

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'CB';
  a.richEditor.innerHTML =
    '<div class="checklist"><div class="checklist-item"><input type="checkbox" id="t1"><label for="t1">one</label></div><div class="checklist-item"><input type="checkbox" id="t2"><label for="t2">two</label></div></div><pre><code>let x = 1;</code></pre>';
  a.saveNote(); // shows viewer
  const boxes = a.viewerText.querySelectorAll('input[type=checkbox]');
  boxes[1].click();
  await new Promise((r) => setTimeout(r, 100));
  const stored = (await window.electronAPI.storage.load()).data.notes[0].content;
  return {
    secondChecked: /id="t2"[^>]*checked|checked[^>]*id="t2"/.test(stored),
    firstChecked: /id="t1"[^>]*checked|checked="checked"[^>]*id="t1"/.test(stored),
    hasCopyBtn: stored.includes('code-copy-btn'),
    viewerHasCopyBtn: !!a.viewerText.querySelector('.code-copy-btn'),
    stored,
  };
}

export const expected = {
  secondChecked: true,
  firstChecked: false,
  hasCopyBtn: false,
  viewerHasCopyBtn: true,
  stored:
    '<div class="checklist"><div class="checklist-item"><input type="checkbox" id="t1"><label for="t1">one</label></div><div class="checklist-item"><input type="checkbox" id="t2" checked="checked"><label for="t2">two</label></div></div><pre><code>let x = 1;</code></pre>',
};
