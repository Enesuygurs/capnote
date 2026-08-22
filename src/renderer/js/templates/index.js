// Parts of the page that live in their own modules to keep index.html short. They are put in
// place before the app starts, so every element exists when the app looks it up.

import { NOTE_EDITOR } from './note-editor.js';
import { SETTINGS_DIALOG } from './settings-dialog.js';
import { NOTE_DIALOGS, APP_DIALOGS } from './dialogs.js';

const TEMPLATES = {
  'note-editor': NOTE_EDITOR,
  'note-dialogs': NOTE_DIALOGS,
  'settings-dialog': SETTINGS_DIALOG,
  'app-dialogs': APP_DIALOGS,
};

// Replaces each <div data-template="name"> placeholder with its markup (static, trusted HTML)
export function renderTemplates(root = document) {
  root.querySelectorAll('[data-template]').forEach((slot) => {
    const markup = TEMPLATES[slot.dataset.template];
    if (markup === undefined) throw new Error(`Unknown template: ${slot.dataset.template}`);
    slot.outerHTML = markup;
  });
}
