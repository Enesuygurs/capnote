// Inserting content into the editor: images, code blocks, lists, tables, dates and pasted text

import { i18n } from '../i18n.js';

export class EditorInsertFeature {
  insertImageAtSelection(src, name) {
    if (!this.richEditor) return;
    const img = document.createElement('img');
    img.src = src;
    img.alt = name || '';
    img.className = 'embedded-image';

    const sel = window.getSelection();
    const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    if (range && this.richEditor.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(img);
    } else {
      this.richEditor.appendChild(img);
    }

    // Wrap it with the resize handle and selection behaviour shared with loaded images
    this.ensureImageWrapper(img);

    // Continue typing after the image
    const wrapper = img.parentElement;
    const after = document.createRange();
    after.setStartAfter(wrapper);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
  }

  // Ensure a given <img> element is wrapped in .img-wrap and has resize handlers
  ensureImageWrapper(img) {
    if (!img || !this.richEditor) return;
    let wrapper = img.parentElement;
    if (!wrapper || !wrapper.classList.contains('img-wrap')) {
      wrapper = document.createElement('span');
      wrapper.className = 'img-wrap';
      wrapper.contentEditable = 'false';
      img.replaceWith(wrapper);
      wrapper.appendChild(img);
    }
    // avoid wiring twice
    if (wrapper.dataset.resizeWired) return;
    wrapper.dataset.resizeWired = '1';

    // ensure handle exists
    let handle = wrapper.querySelector('.img-handle');
    if (!handle) {
      handle = document.createElement('span');
      handle.className = 'img-handle';
      wrapper.appendChild(handle);
    }

    // click to select
    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      Array.from(this.richEditor.querySelectorAll('.img-wrap.selected')).forEach((n) =>
        n.classList.remove('selected')
      );
      wrapper.classList.add('selected');
    });

    // resize handling
    let isResizing = false;
    let startX = 0;
    let startW = 0;
    const imgEl = wrapper.querySelector('img');
    const onMouseMove = (ev) => {
      if (!isResizing) return;
      const dx = ev.clientX - startX;
      const newW = Math.max(24, startW + dx);
      if (imgEl) imgEl.style.width = newW + 'px';
    };
    const onMouseUp = () => {
      if (!isResizing) return;
      isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.trackContentChanges();
    };
    handle.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      isResizing = true;
      startX = ev.clientX;
      startW = imgEl ? imgEl.getBoundingClientRect().width : 0;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // ensure a single document click handler to deselect
    if (!this._imgDocListenerAdded) {
      this._imgDocListenerAdded = true;
      document.addEventListener('click', (e) => {
        if (!this.richEditor) return;
        Array.from(this.richEditor.querySelectorAll('.img-wrap.selected')).forEach((n) => {
          if (!n.contains(e.target)) n.classList.remove('selected');
        });
      });
    }
  }

  upgradeImagesInEditor() {
    if (!this.richEditor) return;
    const imgs = Array.from(this.richEditor.querySelectorAll('img'));
    imgs.forEach((img) => {
      try {
        // If the image is already wrapped (saved HTML may include .img-wrap),
        // unwrap it so we can create a fresh wrapper and attach listeners.
        const parent = img.parentElement;
        if (parent && parent.classList && parent.classList.contains('img-wrap')) {
          try {
            // Replace the wrapper with the raw img node so ensureImageWrapper creates a new wrapper
            parent.replaceWith(img);
          } catch (unwrapErr) {
            // fallback: try to move the img out
            try {
              parent.parentNode.insertBefore(img, parent);
              parent.remove();
            } catch (e) {}
          }
        }
        this.ensureImageWrapper(img);
      } catch (e) {}
    });
  }

  insertCodeBlock() {
    // Insert a fenced code block at the current caret/selection in the appropriate editor.
    // Empty fenced block - caret will be placed inside the empty code area
    const fenceTemplate = '```language\n\n```\n';

    // If markdown editor is visible, insert into textarea at cursor
    if (this.markdownEditor && !this.markdownEditor.classList.contains('hidden')) {
      this.insertAtCursor(this.markdownEditor, fenceTemplate);
      // update preview if visible
      if (this.markdownPreview && !this.markdownPreview.classList.contains('hidden')) {
        this.renderMarkdownPreview(this.markdownEditor.value);
      }
      this.markdownEditor.focus();
      this.trackContentChanges();
      return;
    }

    // Otherwise, insert into rich contenteditable as a <pre><code> block
    if (this.richEditor) {
      this.insertPreCodeForRichEditor();
      this.trackContentChanges();
      return;
    }
  }

  insertAtCursor(textarea, text) {
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const value = textarea.value || '';
    const before = value.substring(0, start);
    const after = value.substring(end);
    textarea.value = before + text + after;

    // If inserting a fenced code block, position caret inside the code area
    if (text.startsWith('```')) {
      // find position after the first newline following the opening fence
      const firstNewline = text.indexOf('\n');
      // place caret at the beginning of the code area (after the opening fence line)
      const caretPos = before.length + (firstNewline >= 0 ? firstNewline + 1 : 0);
      textarea.selectionStart = textarea.selectionEnd = caretPos;
    } else {
      // default: place caret at end of inserted text
      const caret = before.length + text.length;
      textarea.selectionStart = textarea.selectionEnd = caret;
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  insertPreCodeForRichEditor() {
    try {
      const sel = window.getSelection();
      const createPreWithZW = () => {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        const textNode = document.createTextNode('\u200B');
        code.appendChild(textNode);
        pre.appendChild(code);
        return { pre, code, textNode };
      };

      if (!sel || !sel.rangeCount) {
        // append at the end
        const { pre, textNode } = createPreWithZW();
        this.richEditor.appendChild(pre);
        try {
          const newSel = window.getSelection();
          const range = document.createRange();
          range.setStart(textNode, 1);
          range.collapse(true);
          newSel.removeAllRanges();
          newSel.addRange(range);
          this.richEditor.focus();
        } catch (err) {}
        return;
      }

      const range = sel.getRangeAt(0);

      // determine if selection is inside an existing <pre> or <code>
      const commonNode = range.commonAncestorContainer;
      const elementNode =
        commonNode.nodeType === Node.ELEMENT_NODE ? commonNode : commonNode.parentElement;
      const ancestor = elementNode && elementNode.closest ? elementNode.closest('pre, code') : null;

      if (ancestor) {
        // If we are inside a <code> or <pre>, insert the new block after the containing <pre>
        let preAncestor =
          ancestor.tagName && ancestor.tagName.toLowerCase() === 'pre'
            ? ancestor
            : ancestor.closest
              ? ancestor.closest('pre')
              : null;
        if (!preAncestor) preAncestor = ancestor.parentElement;

        const { pre, textNode } = createPreWithZW();
        if (preAncestor && preAncestor.parentNode) {
          if (preAncestor.nextSibling)
            preAncestor.parentNode.insertBefore(pre, preAncestor.nextSibling);
          else preAncestor.parentNode.appendChild(pre);
        } else {
          // fallback: insert at current range
          range.deleteContents();
          range.insertNode(pre);
        }

        try {
          const newSel = window.getSelection();
          const newRange = document.createRange();
          newRange.setStart(textNode, 1);
          newRange.collapse(true);
          newSel.removeAllRanges();
          newSel.addRange(newRange);
          this.richEditor.focus();
        } catch (err) {}

        return;
      }

      // Default: insert at the current range location
      const { pre, textNode } = createPreWithZW();
      range.deleteContents();
      range.insertNode(pre);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStart(textNode, 1);
      newRange.collapse(true);
      sel.addRange(newRange);
      try {
        this.richEditor.focus();
      } catch (e) {}
    } catch (e) {
      // fallback: append
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      const textNode = document.createTextNode('\u200B');
      code.appendChild(textNode);
      pre.appendChild(code);
      this.richEditor.appendChild(pre);
      try {
        const sel2 = window.getSelection();
        const range2 = document.createRange();
        range2.setStart(textNode, 1);
        range2.collapse(true);
        sel2.removeAllRanges();
        sel2.addRange(range2);
        this.richEditor.focus();
      } catch (err) {}
    }
  }

  insertDateTime(type) {
    const now = new Date();
    let text;

    if (type === 'date') {
      text = now.toLocaleDateString(this.getLocale(), {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } else {
      text = now.toLocaleTimeString(this.getLocale(), {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    this.insertTextAtCursor(text);
  }

  insertTextAtCursor(text) {
    document.execCommand('insertText', false, text);
    this.richEditor.focus();
  }

  handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');

    // If there's no selection or no richEditor, fallback to default insert
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      document.execCommand('insertText', false, text);
      this.trackContentChanges();
      return;
    }

    const range = sel.getRangeAt(0);
    // Check if we're pasting inside an existing <code> element
    const codeAncestor =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer.closest && range.startContainer.closest('code')
        : range.startContainer.parentElement && range.startContainer.parentElement.closest('code');

    if (codeAncestor) {
      // Insert the plaintext into the current text node inside <code> preserving newlines
      e.preventDefault();
      let node = range.startContainer;
      let offset = range.startOffset;
      if (node.nodeType !== Node.TEXT_NODE) {
        // prefer an existing text node child or create one
        if (node.childNodes[offset] && node.childNodes[offset].nodeType === Node.TEXT_NODE) {
          node = node.childNodes[offset];
          offset = 0;
        } else {
          node = document.createTextNode('');
          range.insertNode(node);
          offset = 0;
        }
      }
      const before = node.nodeValue ? node.nodeValue.substring(0, offset) : '';
      const after = node.nodeValue ? node.nodeValue.substring(offset) : '';
      node.nodeValue = before + text + after;
      // place caret after pasted text
      const newRange = document.createRange();
      newRange.setStart(node, before.length + text.length);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      this.trackContentChanges();
      return;
    }

    // Insert pasted text as plain text (preserve newlines). Do NOT auto-create <pre><code> blocks.
    // Only special-case pasting when inside an existing <code> (handled above).
    // Use execCommand insertText to preserve simple plaintext insertion behavior in contenteditable.
    document.execCommand('insertText', false, text);
    this.trackContentChanges();
  }

  // Insert HTML at the stored editor selection (or at current caret)
  insertHtmlAtSavedSelection(html) {
    try {
      // Attempt to restore stored selection
      this.restoreEditorSelection();
      // Use execCommand as a fallback for inserting HTML
      if (document.queryCommandSupported && document.queryCommandSupported('insertHTML')) {
        document.execCommand('insertHTML', false, html);
      } else {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          // Append at end
          this.richEditor.insertAdjacentHTML('beforeend', html);
          return;
        }
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const frag = document.createRange().createContextualFragment(html);
        range.insertNode(frag);
      }
    } catch (e) {
      // As a last resort, append to editor
      try {
        this.richEditor.insertAdjacentHTML('beforeend', html);
      } catch (e2) {}
    }
  }

  handleInsertTable() {
    // Read values from modal
    const rows = Math.max(1, parseInt(this.tableRowsInput?.value || '2', 10));
    const cols = Math.max(1, parseInt(this.tableColsInput?.value || '2', 10));
    const hasHeader = !!(this.tableHeaderCheckbox && this.tableHeaderCheckbox.checked);

    // Build simple table HTML
    let html =
      '<table class="inserted-table" border="1" style="border-collapse: collapse; width: 100%;">';
    if (hasHeader) {
      html += '<thead><tr>';
      for (let c = 0; c < cols; c++)
        html += `<th style="padding:6px;text-align:left">${i18n.t('templates.tableHeader', { n: c + 1 })}</th>`;
      html += '</tr></thead>';
    }
    html += '<tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) html += `<td style="padding:6px">&nbsp;</td>`;
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';

    // Insert into editor at caret/selection
    this.insertHtmlAtSavedSelection(html);

    // Update word/char counts and mark note dirty
    try {
      this.captureEditorSelection();
    } catch (e) {}
    try {
      this.updateWordCount();
    } catch (e) {}
    // Close modal
    this.hideModal(this.tableModal);
  }

  // List insertion methods
  insertList(type) {
    this.restoreEditorSelection();
    this.richEditor.focus();
    const items = ['templates.listItem1', 'templates.listItem2', 'templates.listItem3']
      .map((key) => `<li>${this.escapeHtml(i18n.t(key))}</li>`)
      .join('');
    const listHtml = `<${type}>${items}</${type}><p><br></p>`;

    document.execCommand('insertHTML', false, listHtml);
    this.trackContentChanges();
    this.captureEditorSelection();
  }

  insertChecklist() {
    this.restoreEditorSelection();
    this.richEditor.focus();
    const uniqueId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const checklistHtml = `<div class="checklist"><div class="checklist-item"><input type="checkbox" id="${uniqueId}"><label for="${uniqueId}">${this.escapeHtml(i18n.t('templates.task'))}</label></div></div><p><br></p>`;

    document.execCommand('insertHTML', false, checklistHtml);
    this.trackContentChanges();
    this.captureEditorSelection();
  }
}
