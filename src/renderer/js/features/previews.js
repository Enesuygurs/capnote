// The Markdown preview and switching between editor views

export class PreviewsFeature {
  showMarkdownPreview() {
    if (!this.markdownPreview) return;
    this.markdownPreview.classList.remove('hidden');
    this.toggleMarkdownBtn.classList.add('active');
  }

  hideMarkdownPreview() {
    if (!this.markdownPreview) return;
    this.markdownPreview.classList.add('hidden');
    this.toggleMarkdownBtn.classList.remove('active');
  }

  toggleMarkdownMode() {
    // Preview-only mode: render markdown from current editor content or currentNote
    if (!this.markdownPreview) return;
    const isVisible = !this.markdownPreview.classList.contains('hidden');
    if (isVisible) {
      this.hideMarkdownPreview();
      // Restore previous editor visibility
      if (this.currentNote && this.currentNote.isMarkdown && this.markdownEditor) {
        this.showMarkdownEditor();
      } else {
        this.showRichEditor();
      }
    } else {
      // The source is the editor the note is written in: the plain text editor of a Markdown note,
      // else the rich editor
      const sourceText =
        this.currentNote?.isMarkdown && this.markdownEditor
          ? this.markdownEditor.value
          : this.richEditor?.innerText || this.currentNote?.content || '';
      this.renderMarkdownPreview(sourceText);
      // Hide editors while showing preview
      this.hideRichEditor();
      this.hideMarkdownEditor();
      this.showMarkdownPreview();
    }
  }

  renderMarkdownPreview(source) {
    if (!this.markdownPreview) return;
    const md = String(source || '');
    try {
      // Prevent any raw HTML from being interpreted when rendering markdown preview.
      // We escape angle brackets so user HTML doesn't get rendered as HTML in the preview;
      // the preview should show markdown-derived output only.
      const escaped = md.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const html = window.marked && marked.parse ? marked.parse(escaped) : escaped;
      this.markdownPreview.innerHTML = this.sanitizeHtml(html);
      // attach copy buttons to any code blocks in the preview
      this.attachCopyButtonsToPre(this.markdownPreview);
    } catch (e) {
      this.markdownPreview.textContent = md;
    }
  }

  // Editor visibility helpers. The preview button is lit only while the preview is open.
  showMarkdownEditor() {
    if (!this.markdownEditor) return;
    this.markdownEditor.classList.remove('hidden');
    if (this.richEditor) this.richEditor.classList.add('hidden');
  }

  hideMarkdownEditor() {
    if (!this.markdownEditor) return;
    this.markdownEditor.classList.add('hidden');
  }

  showRichEditor() {
    if (this.richEditor) this.richEditor.classList.remove('hidden');
    if (this.markdownEditor) this.markdownEditor.classList.add('hidden');
  }

  hideRichEditor() {
    if (this.richEditor) this.richEditor.classList.add('hidden');
  }

  // The Markdown preview toggle and the markdown editor
  setupPreviewEvents() {
    if (this.toggleMarkdownBtn)
      this.toggleMarkdownBtn.addEventListener('click', () => this.toggleMarkdownMode());

    if (this.markdownEditor)
      this.markdownEditor.addEventListener('input', () => {
        // If preview is visible, live-update it (debounced would be better, but keep simple)
        if (this.markdownPreview && !this.markdownPreview.classList.contains('hidden')) {
          this.renderMarkdownPreview(this.markdownEditor.value);
        }
        this.trackContentChanges();
        this.updateWordCount();
        this.scheduleAutoSave?.();
      });
  }
}
