// "Format while typing" in the settings: on (the default), "- " at the start of a line starts a
// bulleted list and the typing goes on in it; off, the characters stay as typed
export async function run() {
  const a = window.app;
  const keys = async (steps) => {
    window.__keysDone = false;
    console.log('__KEYS__:' + JSON.stringify(steps));
    for (let i = 0; i < 100 && !window.__keysDone; i++) await new Promise((r) => setTimeout(r, 50));
  };
  const r = { atStart: [a.settings.autoFormat, a.autoFormatToggle.checked] };

  a.createNewNote();
  a.richEditor.focus();
  await keys(['- milk', '{Enter}', 'bread', '{Enter}', '{Enter}', '1. first']);
  r.on = a.richEditor.innerHTML;

  a.autoFormatToggle.checked = false;
  a.autoFormatToggle.dispatchEvent(new Event('change'));
  r.saved = a.settings.autoFormat;
  a.createNewNote();
  a.richEditor.focus();
  await keys(['- milk']);
  r.off = a.richEditor.textContent;
  r.offList = !!a.richEditor.querySelector('ul');
  return r;
}

export const expected = {
  atStart: [true, true],
  on: /^<ul><li>milk<\/li><li>bread<\/li><\/ul><ol><li>first(<br>)?<\/li><\/ol>$/,
  saved: false,
  off: '- milk',
  offList: false,
};
