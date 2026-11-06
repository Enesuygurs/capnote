// The quick note window: a title and plain text, saved with Ctrl+Enter (the main window adds the
// note) or opened in the app to go on writing there; Escape closes it. The language, theme,
// accent and "format while typing" come from the app settings in the address.
//
// Formatting while typing, in plain text: "- " (or "* ") at the start of a line becomes "• " and
// "[] " becomes "☐ "; Enter on such a line (or a numbered one, "1. ") starts the next item, and
// Enter on an empty item ends the list. Saved, these lines become real lists in the note.

import { i18n } from './i18n.js';

const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get('theme') === 'dark' ? 'dark' : 'light';
const accent = params.get('accent');
if (/^#[0-9a-f]{6}$/i.test(accent || '')) {
  document.documentElement.style.setProperty('--accent-color', accent);
  document.documentElement.style.setProperty('--primary-color', accent);
}

const api = window.quickNote;
const title = document.getElementById('qnTitle');
const text = document.getElementById('qnText');
const save = document.getElementById('qnSave');
const hint = document.getElementById('qnHint');

const autoFormat = params.get('autoFormat') !== '0';
const MARKS = { '- ': '• ', '* ': '• ', '[] ': '☐ ', '[ ] ': '☐ ' };
const ITEM = /^(• |☐ |☑ |(\d+)\. )/;

// The line the caret is on: where it starts and ends
const caretLine = () => {
  const pos = text.selectionStart;
  const start = text.value.lastIndexOf('\n', pos - 1) + 1;
  const end = text.value.indexOf('\n', pos);
  return { pos, start, end: end < 0 ? text.value.length : end };
};

text.addEventListener('input', (e) => {
  if (!autoFormat || e.inputType !== 'insertText' || e.data !== ' ') return;
  const { pos, start } = caretLine();
  const mark = MARKS[text.value.slice(start, pos)];
  if (mark) text.setRangeText(mark, start, pos, 'end');
});

text.addEventListener('keydown', (e) => {
  if (!autoFormat || e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.isComposing)
    return;
  if (text.selectionStart !== text.selectionEnd) return;
  const { pos, start, end } = caretLine();
  const line = text.value.slice(start, end);
  const item = line.match(ITEM);
  if (!item) return;
  e.preventDefault();
  if (!line.slice(item[0].length).trim()) {
    // An empty item ends the list
    text.setRangeText('', start, end, 'end');
  } else {
    const next = item[2] ? `${Number(item[2]) + 1}. ` : item[1] === '☑ ' ? '☐ ' : item[1];
    text.setRangeText(`\n${next}`, pos, pos, 'end');
  }
  update();
});

// Ctrl+X with nothing selected cuts the line the caret is on, with its line break: the line
// is selected and the browser's own cut does the rest (so it can be undone)
text.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'x') return;
  const area = text;
  if (area.selectionStart !== area.selectionEnd) return;
  const value = area.value;
  const pos = area.selectionStart;
  let start = value.lastIndexOf('\n', pos - 1) + 1;
  let end = value.indexOf('\n', pos);
  // The line break after it goes too; the last line takes the one before it
  if (end >= 0) end += 1;
  else {
    end = value.length;
    if (start > 0) start -= 1;
  }
  if (start !== end) area.setSelectionRange(start, end);
});

const note = () => ({ title: title.value.trim(), text: text.value });
const isEmpty = () => !title.value.trim() && !text.value.trim();
const update = () => {
  save.disabled = isEmpty();
};

// Save needs something written; "open in the app" also takes an empty note (the app's new note)
let busy = false;
async function send(action) {
  if (busy || (action === 'save' && isEmpty())) return;
  busy = true;
  const result = await api?.[action]?.(note());
  busy = false;
  if (!result?.ok) hint.textContent = i18n.t('quickNote.failed');
}

title.addEventListener('input', update);
text.addEventListener('input', update);
// Enter in the title goes on to the text
title.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    text.focus();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    api?.close();
  } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    send('save');
  }
});
save.addEventListener('click', () => send('save'));
document.getElementById('qnExpand').addEventListener('click', () => send('expand'));
document.getElementById('qnClose').addEventListener('click', () => api?.close());

i18n.ready.then(() => {
  i18n.setLanguage(params.get('lang') === 'en' ? 'en' : 'tr');
  const mod = api?.platform === 'darwin' ? '⌘' : 'Ctrl';
  hint.textContent = i18n.t('quickNote.hint', { mod });
});
text.focus();
