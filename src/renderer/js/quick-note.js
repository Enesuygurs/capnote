// The quick note window: a title and plain text, saved with Ctrl+Enter (the main window adds the
// note) or opened in the app to go on writing there; Escape closes it. The language, theme and
// accent come from the app settings in the address.

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
