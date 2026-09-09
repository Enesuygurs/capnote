// Editor tools for lines and links: text style (paragraph, heading 1-3), quote, divider, links,
// and the Markdown-style shortcuts typed at the start of a line ("## ", "- ", "[] ", "```", ...)

import { i18n } from '../i18n.js';

// Lines a style or a shortcut can change: plain paragraphs and headings directly in the note
const LINE = /^(P|DIV|H1|H2|H3)$/;

export class EditorToolsFeature {
  // The line at the caret, if it is one a tool can restyle
  styledLine() {
    const range = this.caretRange();
    const line = range && this.topBlockOf(range.startContainer);
    return line && LINE.test(line.tagName) && !line.classList.contains('checklist') ? line : null;
  }

  // Give a line another tag (p, h1, h2, h3, blockquote) keeping its content, alignment and caret
  retagLine(line, tag) {
    const range = this.caretRange();
    const offset = range ? this.textOffsetIn(line, range) : 0;
    const next = document.createElement(tag);
    next.innerHTML = line.innerHTML || '<br>';
    if (line.getAttribute('style')) next.setAttribute('style', line.getAttribute('style'));
    line.replaceWith(next);
    this.placeCaretAtTextOffset(next, offset);
    return next;
  }

  // ============ Text style ============
  applyBlockStyle(tag) {
    this.restoreEditorSelection();
    this.richEditor.focus();
    const line = this.styledLine();
    if (!line) return;
    if (line.tagName.toLowerCase() !== tag) this.retagLine(line, tag);
    this.trackContentChanges();
    this.updateBlockStyleSelect();
  }

  updateBlockStyleSelect() {
    const range = this.caretRange();
    const line = range && this.topBlockOf(range.startContainer);
    const tag = line && /^H[1-3]$/.test(line.tagName) ? line.tagName.toLowerCase() : 'p';
    this.updateCustomDropdown('blockStyle', tag);
  }

  // ============ Quote ============
  // The line becomes a quote; in a quote, the quote becomes a line again
  toggleQuote() {
    this.restoreEditorSelection();
    this.richEditor.focus();
    const range = this.caretRange();
    const quote = range && range.startContainer.parentElement?.closest('blockquote');
    if (quote && this.richEditor.contains(quote)) {
      this.retagLine(quote, 'p');
    } else {
      const line = this.styledLine();
      if (!line) return;
      this.retagLine(line, 'blockquote');
    }
    this.trackContentChanges();
  }

  // ============ Divider ============
  insertDivider() {
    const hr = this.insertBlockAtCaret('<hr>');
    if (!hr) return;
    this.placeCaret(this.paragraphNextTo(hr), 0);
    this.trackContentChanges();
  }

  // ============ Links ============
  // A typed address becomes a link: web addresses get https://, e-mail addresses mailto:
  normalizeLinkUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) return null;
    if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
    if (/^[\w-]+(\.[\w-]+)+([/?#:].*)?$/.test(value)) return `https://${value}`;
    return null;
  }

  linkAtCaret() {
    const range = this.caretRange();
    const node = range && range.startContainer;
    const link = (node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement)?.closest('a');
    return link && this.richEditor.contains(link) && !link.classList.contains('note-link')
      ? link
      : null;
  }

  // The link dialog, filled with the selected text or the link at the caret
  showLinkModal() {
    this.restoreEditorSelection();
    this.richEditor.focus();
    this.captureEditorSelection();
    const link = this.linkAtCaret();
    this.editingLink = link;
    const selected = window.getSelection().toString();
    this.linkTextInput.value = link ? link.textContent : selected;
    this.linkUrlInput.value = link ? link.getAttribute('href') || '' : '';
    this.removeLinkBtn.classList.toggle('hidden', !link);
    this.showModal(this.linkModal);
    setTimeout(() => (link || selected ? this.linkUrlInput : this.linkTextInput).focus(), 50);
  }

  applyLink() {
    const url = this.normalizeLinkUrl(this.linkUrlInput.value);
    if (!url) {
      this.showNotification(i18n.t('messages.invalidLink'), 'warning');
      return;
    }
    const text = this.linkTextInput.value.trim() || url.replace(/^mailto:/, '');
    this.hideModal(this.linkModal);
    this.restoreEditorSelection();
    this.richEditor.focus();

    let link =
      this.editingLink && this.richEditor.contains(this.editingLink) ? this.editingLink : null;
    if (link) {
      link.setAttribute('href', url);
      if (link.textContent !== text) link.textContent = text;
    } else {
      const range = this.caretRange() || (this.placeCaretAtEnd(this.richEditor), this.caretRange());
      const selected = range.toString();
      if (selected && selected === text) {
        // Keep the selection's own formatting inside the link
        document.execCommand('createLink', false, url);
        link = this.linkAtCaret();
      } else {
        range.deleteContents();
        link = document.createElement('a');
        link.href = url;
        link.textContent = text;
        range.insertNode(link);
      }
    }
    if (link) {
      const after = document.createRange();
      after.setStartAfter(link);
      after.collapse(true);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(after);
    }
    this.editingLink = null;
    this.captureEditorSelection();
    this.trackContentChanges();
  }

  removeLink() {
    const link = this.editingLink;
    this.hideModal(this.linkModal);
    if (link && this.richEditor.contains(link)) {
      link.replaceWith(...link.childNodes);
      this.trackContentChanges();
    }
    this.editingLink = null;
  }

  // ============ Shortcuts typed at the start of a line ============
  // Delete the first `count` characters of an element's text
  removeLeadingText(el, count) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let left = count;
    let node = walker.nextNode();
    while (node && left > 0) {
      const take = Math.min(left, node.length);
      node.deleteData(0, take);
      left -= take;
      node = walker.nextNode();
    }
    if (!el.textContent) el.innerHTML = '<br>';
  }

  // "## " heading, "- " list, "1. " numbered list, "[] " task, "> " quote, "```" code block
  handleLineShortcut(e) {
    if (e.inputType !== 'insertText' || (e.data !== ' ' && e.data !== '`')) return;
    const line = this.styledLine();
    const range = this.caretRange();
    if (!line || !range || !range.collapsed || line.tagName !== 'P') return;
    const before = line.textContent
      .slice(0, this.textOffsetIn(line, range))
      .replace(/\u00a0/g, ' ');

    if (e.data === '`') {
      if (before === '```' && line.textContent === '```') {
        line.innerHTML = '<br>';
        this.placeCaret(line, 0);
        const pre = this.insertBlockAtCaret('<pre><code>\u200B</code></pre>');
        if (pre) this.placeCaret(pre.querySelector('code').firstChild, 1);
        this.trackContentChanges();
      }
      return;
    }

    const shortcuts = {
      '# ': 'h1',
      '## ': 'h2',
      '### ': 'h3',
      '- ': 'ul',
      '* ': 'ul',
      '1. ': 'ol',
      '[] ': 'task',
      '[ ] ': 'task',
      '[x] ': 'done',
      '> ': 'blockquote',
    };
    const kind = shortcuts[before];
    if (!kind) return;
    this.removeLeadingText(line, before.length);

    if (/^h[1-3]$|^blockquote$/.test(kind)) {
      this.placeCaret(this.retagLine(line, kind), 0);
    } else if (kind === 'ul' || kind === 'ol') {
      const list = document.createElement(kind);
      const item = document.createElement('li');
      item.innerHTML = line.innerHTML;
      list.appendChild(item);
      line.replaceWith(list);
      this.placeCaret(item, 0);
    } else {
      const list = document.createElement('div');
      list.className = 'checklist';
      list.innerHTML = this.checklistItemHtml(line.innerHTML);
      if (kind === 'done') list.querySelector('input').setAttribute('checked', 'checked');
      this.restoreCheckboxStates();
      line.replaceWith(list);
      this.paragraphNextTo(list);
      const label = list.querySelector('label');
      this.placeCaret(label, 0);
    }
    this.trackContentChanges();
  }

  // "---" and Enter on a line of its own makes a divider
  handleDividerEnter(e) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    const line = this.styledLine();
    if (!line || line.tagName !== 'P' || line.textContent.trim() !== '---') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const hr = document.createElement('hr');
    line.replaceWith(hr);
    this.placeCaret(this.paragraphNextTo(hr), 0);
    this.trackContentChanges();
  }

  setupEditorTools() {
    this.insertLinkBtn?.addEventListener('click', () => this.showLinkModal());
    this.insertQuoteBtn?.addEventListener('click', () => this.toggleQuote());
    this.insertDividerBtn?.addEventListener('click', () => this.insertDivider());
    this.applyLinkBtn?.addEventListener('click', () => this.applyLink());
    this.removeLinkBtn?.addEventListener('click', () => this.removeLink());
    this.cancelLinkBtn?.addEventListener('click', () => this.hideModal(this.linkModal));

    this.richEditor.addEventListener('input', (e) => this.handleLineShortcut(e));
    this.richEditor.addEventListener('keydown', (e) => this.handleDividerEnter(e), true);
    // Ctrl+K adds a link (or edits the one at the caret)
    this.richEditor.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.showLinkModal();
      }
    });
    // The text style list follows the caret
    this.richEditor.addEventListener('keyup', () => this.updateBlockStyleSelect());
    this.richEditor.addEventListener('mouseup', () => this.updateBlockStyleSelect());
  }
}
