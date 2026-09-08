// Exporting a single note (text, HTML, JSON, PDF)

import { i18n } from '../i18n.js';

export class ExportFeature {
  // Export methods
  showExportModal() {
    if (!this.currentNote || this.isNoteLockedForView(this.currentNote)) return;
    this.showModal(this.exportModal);
  }

  // A file name from a title: characters Windows does not allow become "_"
  exportFileName(title, extension) {
    const base =
      String(title || '')
        .replace(/[\\/:*?"<>|]+/g, '_')
        .trim() || 'note';
    return `${base}.${extension}`;
  }

  // Tell how a save went: saved, cancelled (nothing to say) or failed
  reportSave(result, successKey) {
    if (result && result.ok) this.showNotification(i18n.t(successKey), 'success');
    else if (!result || !result.canceled)
      this.showNotification(i18n.t('messages.exportFailed'), 'error');
  }

  async exportNote(type) {
    const note = this.currentNote;
    if (!note || this.isNoteLockedForView(note)) return;
    if (type === 'pdf') return this.exportToPDF();

    let result;
    try {
      if (type === 'html') {
        result = await window.electronAPI.exportHtml({
          title: note.title,
          bodyHtml: this.buildExportBody(note),
          fileName: this.exportFileName(note.title, 'html'),
        });
      } else {
        const content = type === 'json' ? JSON.stringify(note, null, 2) : this.noteAsText(note);
        result = await window.electronAPI.saveFile({
          fileName: this.exportFileName(note.title, type),
          content,
          type,
        });
      }
    } catch (err) {
      console.error('Export failed:', err);
      result = { ok: false };
    }
    this.reportSave(result, 'messages.noteExported');
  }

  // The note as plain text: its title, then its text line by line (markdown notes keep their
  // markdown). Tasks read "[x] done" / "[ ] open", list items get a dash or their number and
  // table cells are separated by tabs.
  noteAsText(note) {
    const body = note.isMarkdown ? note.content || '' : this.htmlToText(note.content);
    return `${note.title || ''}\n\n${body}`.trim() + '\n';
  }

  htmlToText(html) {
    const lines = [];
    let line = '';
    const end = () => {
      if (line.trim()) lines.push(line.replace(/\s+$/, ''));
      line = '';
    };
    const BLOCK = /^(P|DIV|H[1-6]|LI|TR|PRE|BLOCKQUOTE|UL|OL|TABLE|HR)$/;
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        line += node.nodeValue.replace(/\u200B/g, '');
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName;
      if (tag === 'BR') return end();
      if (tag === 'INPUT' && node.type === 'checkbox') {
        line += node.hasAttribute('checked') ? '[x] ' : '[ ] ';
        return;
      }
      if (tag === 'PRE') {
        end();
        node.textContent
          .replace(/\u200B/g, '')
          .split('\n')
          .forEach((l) => lines.push(l));
        return;
      }
      const block = BLOCK.test(tag) || node.classList.contains('checklist-item');
      if (block) end();
      if (tag === 'LI') {
        const list = node.parentElement;
        line += list && list.tagName === 'OL' ? `${[...list.children].indexOf(node) + 1}. ` : '- ';
      }
      [...node.childNodes].forEach((child, i) => {
        if ((child.tagName === 'TD' || child.tagName === 'TH') && i > 0) line += '\t';
        walk(child);
      });
      if (block) end();
    };
    walk(this.parseInertHtml(this.sanitizeHtml(html || '')));
    end();
    return lines.join('\n');
  }

  // Shared markup for exported notes (PDF and HTML exports)
  buildExportBody(note) {
    const locale = this.getLocale();
    const content = this.parseInertHtml(
      this.sanitizeHtml(
        note.isMarkdown && window.marked ? marked.parse(note.content || '') : note.content || ''
      )
    );
    content.querySelectorAll('.code-copy-btn').forEach((btn) => btn.remove());

    const tags = (note.tags || [])
      .map((tag) => `<span class="export-tag">${this.escapeHtml(tag)}</span>`)
      .join('');
    const moodName = this.findMoodButton(note.mood)?.title;
    const weatherName = this.findWeatherButton(note.weather)?.title;
    const mood = moodName
      ? `<p class="export-meta">${i18n.t('sections.mood')}: ${this.escapeHtml(moodName)}</p>`
      : '';
    const weather = weatherName
      ? `<p class="export-meta">${i18n.t('sections.weather')}: ${this.escapeHtml(weatherName)}</p>`
      : '';
    return `<div class="export-header">
  <h1>${this.escapeHtml(note.title || '')}</h1>
  <p class="export-meta">${i18n.t('viewer.createdLabel')} ${new Date(note.createdAt).toLocaleString(locale)}</p>
  <p class="export-meta">${i18n.t('viewer.updatedLabel')} ${new Date(note.updatedAt).toLocaleString(locale)}</p>
  ${mood}${weather}
</div>
<div class="export-content">${content.innerHTML}</div>
${tags ? `<div class="export-tags">${tags}</div>` : ''}`;
  }

  async exportToPDF() {
    const note = this.currentNote;
    if (!note) return this.showNotification(i18n.t('messages.noNoteSelected'), 'warning');

    try {
      const result = await window.electronAPI.exportPdf({
        title: note.title,
        bodyHtml: this.buildExportBody(note),
        fileName: this.exportFileName(note.title, 'pdf'),
      });
      if (result && result.ok) {
        this.showNotification(i18n.t('messages.pdfCreated'), 'success');
      } else if (!result || !result.canceled) {
        this.showNotification(i18n.t('messages.pdfError'), 'error');
      }
    } catch (err) {
      console.error('exportToPDF error', err);
      this.showNotification(i18n.t('messages.pdfExportError'), 'error');
    }
  }
}
