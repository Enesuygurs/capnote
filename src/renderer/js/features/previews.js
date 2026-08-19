// Markdown and HTML previews and switching between editor views

export class PreviewsFeature {
  showMarkdownPreview() {
    if (!this.markdownPreview) return;
    this.markdownPreview.classList.remove('hidden');
    this.toggleMarkdownBtn.classList.add('active');
    if (this.toggleHtmlBtn) this.toggleHtmlBtn.classList.remove('active');
  }

  hideMarkdownPreview() {
    if (!this.markdownPreview) return;
    this.markdownPreview.classList.add('hidden');
    this.toggleMarkdownBtn.classList.remove('active');
  }

  toggleMarkdownMode() {
    // Preview-only mode: render markdown from current editor content or currentNote
    if (!this.markdownPreview) return;
    // If HTML preview is open, close it so only one preview is active
    if (this.htmlPreview && !this.htmlPreview.classList.contains('hidden')) {
      this.hideHtmlPreview();
    }
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
      // Get source text: prefer current rich editor text (so user edits immediately reflect preview)
      const sourceText =
        this.markdownEditor && !this.markdownEditor.classList.contains('hidden')
          ? this.markdownEditor.value
          : this.richEditor && this.richEditor.innerText
            ? this.richEditor.innerText
            : this.currentNote && this.currentNote.content
              ? this.currentNote.content
              : '';
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

  // HTML preview functions
  showHtmlPreview() {
    if (!this.htmlPreview) return;
    this.htmlPreview.classList.remove('hidden');
    if (this.toggleHtmlBtn) this.toggleHtmlBtn.classList.add('active');
    if (this.toggleMarkdownBtn) this.toggleMarkdownBtn.classList.remove('active');
  }

  hideHtmlPreview() {
    if (!this.htmlPreview) return;
    this.htmlPreview.classList.add('hidden');
    if (this.toggleHtmlBtn) this.toggleHtmlBtn.classList.remove('active');
  }

  toggleHtmlMode() {
    if (!this.htmlPreview) return;
    const isVisible = !this.htmlPreview.classList.contains('hidden');
    if (isVisible) {
      this.hideHtmlPreview();
      // restore editor
      if (this.currentNote && this.currentNote.isMarkdown && this.markdownEditor)
        this.showMarkdownEditor();
      else this.showRichEditor();
      return;
    }

    // Ensure markdown preview is hidden if open and deactivate its button
    if (this.markdownPreview && !this.markdownPreview.classList.contains('hidden')) {
      this.hideMarkdownPreview();
    }
    if (this.toggleMarkdownBtn) this.toggleMarkdownBtn.classList.remove('active');

    // Render raw HTML from current source: prefer markdownEditor (if editing markdown), else richEditor.innerHTML
    const sourceHtml =
      this.markdownEditor && !this.markdownEditor.classList.contains('hidden')
        ? this.markdownEditor.value
        : this.richEditor
          ? this.richEditor.innerHTML
          : '';

    // If sourceHtml is Markdown (note.isMarkdown), render via marked then show raw HTML
    try {
      let htmlToShow = sourceHtml;
      if (this.currentNote && this.currentNote.isMarkdown) {
        // Prefer explicit HTML code fences: ```html
        const fenceMatch = sourceHtml.match(/```(?:html|HTML|htm)\s*\n([\s\S]*?)```/);
        if (fenceMatch) {
          htmlToShow = fenceMatch[1];
        } else {
          // Otherwise render the markdown to HTML
          htmlToShow = window.marked && marked.parse ? marked.parse(sourceHtml) : sourceHtml;
        }
      } else {
        // If rich editor content contains escaped HTML entities like &lt;div&gt;, unescape them
        const text = this.parseInertHtml(sourceHtml).textContent || '';
        if (text.includes('<') && text.includes('>')) {
          htmlToShow = text;
        } else {
          htmlToShow = sourceHtml;
        }
      }

      // Create or reuse a sandboxed iframe to isolate user HTML/CSS from the parent app
      let iframe = this.htmlPreview.querySelector('iframe.preview-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.className = 'preview-iframe';
        // sandbox without allow-scripts to prevent script execution; keep it strict
        iframe.setAttribute('sandbox', '');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = '0';
        iframe.style.display = 'block';
        // ensure iframe occupies the container
        this.htmlPreview.innerHTML = '';
        this.htmlPreview.appendChild(iframe);
      }

      // Nothing is inherited across the iframe boundary, so pass the app's text style and theme in
      const style = getComputedStyle(this.htmlPreview);
      const scheme =
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const linkColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--link-color')
        .trim();
      const doc =
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<style>html{color-scheme:${scheme};} html,body{margin:0;padding:0;box-sizing:border-box;}` +
        ` body{font-family:${style.fontFamily};font-size:${style.fontSize};line-height:${style.lineHeight};color:${style.color};}` +
        ` a{color:${linkColor || 'inherit'};} img{max-width:100%;height:auto;}` +
        ` ::-webkit-scrollbar{width:8px;height:8px;} ::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.35);border-radius:4px;}` +
        `</style></head><body>${htmlToShow}</body></html>`;
      // The frame element needs the same color scheme, or Chromium paints an opaque backdrop behind it
      iframe.style.colorScheme = scheme;
      iframe.srcdoc = doc;
    } catch (e) {
      this.htmlPreview.textContent = sourceHtml;
    }

    // Hide editors while showing HTML preview
    this.hideRichEditor();
    this.hideMarkdownEditor();
    this.showHtmlPreview();
    // deactivate markdown button to make previews mutually exclusive
    if (this.toggleMarkdownBtn) this.toggleMarkdownBtn.classList.remove('active');
  }

  // Editor visibility helpers
  showMarkdownEditor() {
    if (!this.markdownEditor) return;
    this.markdownEditor.classList.remove('hidden');
    if (this.richEditor) this.richEditor.classList.add('hidden');
    this.toggleMarkdownBtn.classList.toggle('active', true);
  }

  hideMarkdownEditor() {
    if (!this.markdownEditor) return;
    this.markdownEditor.classList.add('hidden');
    this.toggleMarkdownBtn.classList.toggle('active', false);
  }

  showRichEditor() {
    if (this.richEditor) this.richEditor.classList.remove('hidden');
    if (this.markdownEditor) this.markdownEditor.classList.add('hidden');
    this.toggleMarkdownBtn.classList.toggle('active', false);
  }

  hideRichEditor() {
    if (this.richEditor) this.richEditor.classList.add('hidden');
  }

  // Markdown/HTML preview toggles and the markdown editor
  setupPreviewEvents() {
    // Markdown toggle and preview
    if (this.toggleMarkdownBtn)
      this.toggleMarkdownBtn.addEventListener('click', () => this.toggleMarkdownMode());

    if (this.toggleHtmlBtn)
      this.toggleHtmlBtn.addEventListener('click', () => this.toggleHtmlMode());

    if (this.markdownEditor)
      this.markdownEditor.addEventListener('input', () => {
        // If preview is visible, live-update it (debounced would be better, but keep simple)
        if (this.markdownPreview && !this.markdownPreview.classList.contains('hidden')) {
          this.renderMarkdownPreview(this.markdownEditor.value);
        }
        this.trackContentChanges();
      });
  }
}
