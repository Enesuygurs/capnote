// The main window's side of the quick note window (src/main/quick-note.js): a note saved there is
// added to the notes without touching what is open in the editor, and "open in the app" goes on
// with it as a new note in the editor

import { i18n } from '../i18n.js';

export class QuickNoteFeature {
  // Plain text as the editor writes it: paragraphs, and with "format while typing" on, the marked
  // lines as blocks: "• " / "- " a bulleted list, "1. " a numbered one, "☐ " / "[] " a task ("☑ " /
  // "[x] " a done one), "# " to "### " a heading, "> " a quote. Lines of one kind in a row make one
  // list.
  quickNoteHtml(text) {
    const lines = String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/^\n+|\s+$/g, '')
      .split('\n');
    if (lines.length === 1 && !lines[0]) return '';
    const kindOf = (line) => {
      if (this.settings?.autoFormat === false) return null;
      let m = line.match(/^[•*-] (.*)$/);
      if (m) return { kind: 'ul', text: m[1] };
      m = line.match(/^\d+\. (.*)$/);
      if (m) return { kind: 'ol', text: m[1] };
      m = line.match(/^(?:☐|\[ ?\]) (.*)$/);
      if (m) return { kind: 'task', text: m[1] };
      m = line.match(/^(?:☑|\[x\]) (.*)$/i);
      if (m) return { kind: 'task', text: m[1], done: true };
      m = line.match(/^(#{1,3}) (.*)$/);
      if (m) return { kind: `h${m[1].length}`, text: m[2] };
      m = line.match(/^> (.*)$/);
      if (m) return { kind: 'blockquote', text: m[1] };
      return null;
    };
    const inline = (value) => this.escapeHtml(value) || '<br>';
    const html = [];
    let group = null;
    const flush = () => {
      if (!group) return;
      if (group.kind === 'task') {
        html.push(`<div class="checklist">${group.items.join('')}</div>`);
      } else {
        html.push(
          `<${group.kind}>${group.items.map((i) => `<li>${i}</li>`).join('')}</${group.kind}>`
        );
      }
      group = null;
    };
    lines.forEach((line) => {
      const block = kindOf(line);
      if (block && /^(ul|ol|task)$/.test(block.kind)) {
        if (group?.kind !== block.kind) {
          flush();
          group = { kind: block.kind, items: [] };
        }
        let item =
          block.kind === 'task' ? this.checklistItemHtml(inline(block.text)) : inline(block.text);
        if (block.done)
          item = item.replace('<input type="checkbox"', '<input type="checkbox" checked');
        group.items.push(item);
        return;
      }
      flush();
      if (block) html.push(`<${block.kind}>${inline(block.text)}</${block.kind}>`);
      else html.push(line ? `<p>${this.escapeHtml(line)}</p>` : '<p><br></p>');
    });
    flush();
    return html.join('');
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
