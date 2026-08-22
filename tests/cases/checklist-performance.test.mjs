// Typing in a long checklist stays fast and keeps the ticked boxes

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'Perf';
  let html = '<div class="checklist">';
  for (let i = 0; i < 200; i++)
    html += `<div class="checklist-item"><input type="checkbox" id="p${i}"${i % 2 ? ' checked="checked"' : ''}><label for="p${i}">task ${i}</label></div>`;
  a.richEditor.innerHTML = html + '</div><p>end</p>';
  const first = a.richEditor.querySelector('#p0');
  first.click(); // user ticks the first box
  const t0 = performance.now();
  for (let i = 0; i < 50; i++) a.trackContentChanges(); // 50 "keystrokes"
  const ms = Math.round(performance.now() - t0);
  const sameElement = a.richEditor.querySelector('#p0') === first;
  a.saveNote(true);
  const stored = (await window.electronAPI.storage.load()).data.notes[0].content;
  return {
    ms,
    sameElement,
    firstSaved:
      /id="p0" checked="checked"|checked="checked" id="p0"/.test(stored) ||
      stored.includes('id="p0" checked'),
    secondStillChecked: /id="p1" checked/.test(stored),
  };
}

export const expected = {
  // 50 change checks on a 200-item checklist
  ms: (ms) => ms < 500,
  sameElement: true,
  firstSaved: true,
  secondStillChecked: true,
};
