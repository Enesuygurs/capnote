// The main window's side of the quick note window (src/main/quick-note.js): a note saved there is
// added to the notes without touching what is open in the editor, and "open in the app" goes on
// with it as a new note in the editor

import { i18n } from '../i18n.js';

export class QuickNoteFeature {
  // Plain text as paragraphs, as the editor writes them
  quickNoteHtml(text) {
    const lines = String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/^\n+|\s+$/g, '')
      .split('\n');
    if (lines.length === 1 && !lines[0]) return '';
    return lines.map((line) => (line ? `<p>${this.escapeHtml(line)}</p>` : '<p><br></p>')).join('');
  }

  addQuickNote({ title = '', text = '' } = {}) {
    const name = String(title).trim();
    const content = this.quickNoteHtml(text);
    if (!name && !content) return null;
    const now = new Date().toISOString();
    const counts = this.countWordsAndCharsFromHtml(content);
    const note = {
      id: this.newId(),
      title: name,
      content,
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      mood: null,
      weather: null,
      tags: [],
      wordCount: counts.words,
      charCount: counts.chars,
      isLocked: false,
      folderId: null,
      attachments: [],
      formatting: { ...this.getDefaultFormatting(), textAlign: 'left' },
      history: [{ type: 'created', ts: now }],
    };
    this.notes.unshift(note);
    this.saveNotes();
    this.updateNotesList();
    this.updateFoldersList();
    this.updateStats();
    if (this.currentNote) this.setActiveNoteInList(this.currentNote.id);
    this.showNotification(i18n.t('quickNote.added'), 'success');
    return note;
  }

  // Go on writing it in the editor, as a new note
  openQuickNoteInApp({ title = '', text = '' } = {}) {
    this.createNewNote();
    this.noteTitle.value = String(title).trim();
    const content = this.quickNoteHtml(text);
    if (content) {
      this.richEditor.innerHTML = content;
      this.richEditor.focus();
      const range = document.createRange();
      range.selectNodeContents(this.richEditor);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    this.richEditor.dispatchEvent(new Event('input', { bubbles: true }));
    this.updateSaveButtonState();
  }

  setupQuickNote() {
    window.electronAPI?.onQuickNote?.((note) => this.addQuickNote(note));
    window.electronAPI?.onQuickNoteOpen?.((note) => this.openQuickNoteInApp(note));
  }
}
