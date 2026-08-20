// Exporting a single note (text, HTML, JSON, PDF)

import { i18n } from '../i18n.js';

export class ExportFeature {
  // Export methods
  showExportModal() {
    if (!this.currentNote || this.isNoteLockedForView(this.currentNote)) return;
    this.showModal(this.exportModal);
  }

  exportNote(type) {
    if (!this.currentNote || this.isNoteLockedForView(this.currentNote)) return;

    let content, filename, mimeType;

    switch (type) {
      case 'txt':
        content = this.getPlainText(this.currentNote.content);
        filename = `${this.currentNote.title}.txt`;
        mimeType = 'text/plain';
        break;
      case 'html':
        content = this.generateHTMLExport(this.currentNote);
        filename = `${this.currentNote.title}.html`;
        mimeType = 'text/html';
        break;
      case 'json':
        content = JSON.stringify(this.currentNote, null, 2);
        filename = `${this.currentNote.title}.json`;
        mimeType = 'application/json';
        break;
      case 'pdf':
        this.exportToPDF();
        return;
    }

    this.downloadFile(content, filename, mimeType);
    this.showNotification(i18n.t('messages.noteExported'), 'success');
  }

  generateHTMLExport(note) {
    return `<!DOCTYPE html>
<html lang="${i18n.currentLanguage}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(note.title || '')}</title>
  <style>
    body { font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif; color: #111827; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 24px; }
    .export-header { border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px; }
    .export-meta { color: #6b7280; font-size: 12px; margin: 2px 0; }
    .export-tags { margin-top: 24px; }
    .export-tag { display: inline-block; background: #f3f4f6; border-radius: 4px; padding: 2px 8px; margin-right: 6px; font-size: 12px; }
    img { max-width: 100%; height: auto; }
    pre { background: #f6f8fa; border-radius: 6px; padding: 12px; white-space: pre-wrap; }
  </style>
</head>
<body>
${this.buildExportBody(note)}
</body>
</html>`;
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      const safeName = (note.title || 'note').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'note';
      const result = await window.electronAPI.exportPdf({
        title: note.title,
        bodyHtml: this.buildExportBody(note),
        fileName: `${safeName}.pdf`,
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
