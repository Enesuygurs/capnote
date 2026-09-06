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

    // Otherwise, insert into rich contenteditable as a <pre><code> block on its own line
    if (this.richEditor) this.insertCodeBlockInRich();
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
    // The text goes where the caret was in the note, even if a button took the focus
    this.restoreEditorSelection();
    this.richEditor.focus();
    if (!this.caretRange()) this.placeCaretAtEnd(this.richEditor);
    document.execCommand('insertText', false, text);
    this.captureEditorSelection();
    this.trackContentChanges();
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
      for (let c = 0; c < cols; c++) html += `<td style="padding:6px"><br></td>`;
      html += '</tr>';
    }
    html += '</tbody></table>';

    // Insert on its own line at the caret, with a line below it, and start in the first cell
    const table = this.insertBlockAtCaret(html);
    const firstCell = table?.querySelector('td');
    if (firstCell) this.placeCaret(firstCell, 0);

    // Update word/char counts and mark note dirty
    this.captureEditorSelection();
    this.updateWordCount();
    // Close modal
    this.hideModal(this.tableModal);
  }

  // Enter inside code blocks, pasting and dropping files
  setupInsertEvents() {
    if (this.insertCodeBlockBtn)
      this.insertCodeBlockBtn.addEventListener('click', () => this.insertCodeBlock());

    // Allow Enter inside <code> blocks in rich editor to create newlines instead of splitting nodes
    this.richEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const codeAncestor =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer.closest && range.startContainer.closest('code')
            : range.startContainer.parentElement &&
              range.startContainer.parentElement.closest('code');
        // also detect a containing <pre> in case selection sits directly inside <pre>
        const preAncestor =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer.closest && range.startContainer.closest('pre')
            : range.startContainer.parentElement &&
              range.startContainer.parentElement.closest('pre');
        if (codeAncestor || preAncestor) {
          // inside a <code> node. Allow exiting the code block via Ctrl/Cmd+Enter or
          // by pressing Enter on an empty line at the end of the code block.
          // If exit is requested, create a paragraph after the containing <pre> and move caret there.
          const isExitShortcut = e.ctrlKey || e.metaKey;
          // determine the text node and its content length
          let node = range.startContainer;
          let offset = range.startOffset;
          // If the user pressed Ctrl/Cmd+Enter, immediately exit the nearest <pre> by
          // inserting a paragraph after it. This avoids edge cases where selection
          // nodes are in unusual spots and makes the shortcut reliable.
          if (isExitShortcut) {
            e.preventDefault();
            try {
              // find a <pre> ancestor starting from the startContainer
              let findNode = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
              while (
                findNode &&
                findNode !== this.richEditor &&
                findNode.tagName &&
                findNode.tagName.toLowerCase() !== 'pre'
              ) {
                findNode = findNode.parentElement;
              }
              const resolvedPre =
                findNode && findNode.tagName && findNode.tagName.toLowerCase() === 'pre'
                  ? findNode
                  : null;
              const para = document.createElement('p');
              para.innerHTML = '<br>';
              if (resolvedPre && resolvedPre.parentNode) {
                if (resolvedPre.nextSibling)
                  resolvedPre.parentNode.insertBefore(para, resolvedPre.nextSibling);
                else resolvedPre.parentNode.appendChild(para);
              } else {
                // fallback: append to editor
                this.richEditor.appendChild(para);
              }
              const newSel = window.getSelection();
              const newRange = document.createRange();
              newRange.setStart(para, 0);
              newRange.collapse(true);
              newSel.removeAllRanges();
              newSel.addRange(newRange);
              this.richEditor.focus();
              this.trackContentChanges();
            } catch (err) {
              // ignore; allow other logic to try
            }
            return;
          }
          if (node.nodeType !== Node.TEXT_NODE) {
            if (node.childNodes[offset] && node.childNodes[offset].nodeType === Node.TEXT_NODE) {
              node = node.childNodes[offset];
              offset = 0;
            }
          }
          // otherwise we're inside a <code> node: insert a newline at the caret.
          // Only Ctrl/Cmd+Enter above exits the code block; plain Enter should reliably add a newline.
          e.preventDefault();
          try {
            // Ensure we operate on a text node if possible
            if (node.nodeType !== Node.TEXT_NODE) {
              // prefer a text child at the offset
              if (
                node.childNodes &&
                node.childNodes[offset] &&
                node.childNodes[offset].nodeType === Node.TEXT_NODE
              ) {
                node = node.childNodes[offset];
                offset = 0;
              } else {
                // try previous sibling text node
                let prev =
                  node.childNodes && node.childNodes[offset - 1]
                    ? node.childNodes[offset - 1]
                    : null;
                while (prev && prev.nodeType !== Node.TEXT_NODE)
                  prev = prev && prev.previousSibling ? prev.previousSibling : null;
                if (prev && prev.nodeType === Node.TEXT_NODE) {
                  node = prev;
                  offset = node.nodeValue ? node.nodeValue.length : 0;
                }
              }
            }

            // If we found or coerced to a text node, insert into it
            if (node && node.nodeType === Node.TEXT_NODE) {
              const text = node.nodeValue || '';
              const before = text.substring(0, offset);
              let after = text.substring(offset);
              // if the text after caret already begins with a ZWSP, avoid adding another
              const ZW = '\u200B';
              let insertMarker = ZW;
              if (after && after.startsWith(ZW)) insertMarker = '';
              node.nodeValue = before + '\n' + insertMarker + after;
              // place caret after the inserted newline (before the marker)
              const newRange = document.createRange();
              newRange.setStart(node, before.length + 1);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
              this.trackContentChanges();
            } else {
              // fallback: append a text node with newline to the deepest codeAncestor and place caret after it
              const textNode = document.createTextNode('\n');
              // find a sensible insertion point: prefer range.insertNode if possible
              try {
                // if inserting a new line node, include a ZWSP so caret has a visible spot
                const ZW = '\u200B';
                if (!textNode.nodeValue || !textNode.nodeValue.startsWith('\n'))
                  textNode.nodeValue = '\n' + ZW;
                range.insertNode(textNode);
                // move caret after inserted node (position will be after the newline)
                range.setStartAfter(textNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              } catch (innerErr) {
                try {
                  // fallback to appending to codeAncestor
                  (codeAncestor || this.richEditor).appendChild(textNode);
                  const newRange2 = document.createRange();
                  newRange2.setStartAfter(textNode);
                  newRange2.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(newRange2);
                } catch (finalErr) {
                  // as a last resort, insert a paragraph after the pre (exit behavior)
                  try {
                    const para = document.createElement('p');
                    para.innerHTML = '<br>';
                    const resolvedPre =
                      preAncestor ||
                      (codeAncestor &&
                        (codeAncestor.closest
                          ? codeAncestor.closest('pre')
                          : codeAncestor.parentElement));
                    if (resolvedPre && resolvedPre.parentNode) {
                      if (resolvedPre.nextSibling)
                        resolvedPre.parentNode.insertBefore(para, resolvedPre.nextSibling);
                      else resolvedPre.parentNode.appendChild(para);
                    } else {
                      this.richEditor.appendChild(para);
                    }
                    const newSel = window.getSelection();
                    const newRange3 = document.createRange();
                    newRange3.setStart(para, 0);
                    newRange3.collapse(true);
                    newSel.removeAllRanges();
                    newSel.addRange(newRange3);
                  } catch (err) {}
                }
              }
              this.trackContentChanges();
            }
          } catch (err) {
            // ignore insertion failures and allow normal behavior as a fallback
          }
        }
      }
    });

    this.richEditor.addEventListener('paste', (e) => this.handlePaste(e));

    // Drag & drop support: accept files/images dropped into the rich editor
    this.richEditor.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      this.richEditor.classList.add('drag-over');
    });

    this.richEditor.addEventListener('dragleave', (e) => {
      this.richEditor.classList.remove('drag-over');
    });

    this.richEditor.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.richEditor.classList.remove('drag-over');
      const dt = e.dataTransfer;
      if (!dt || !dt.files || dt.files.length === 0) return;
      for (let i = 0; i < dt.files.length; i++) {
        const f = dt.files[i];
        try {
          // ask main process to copy file into app uploads and return a file:// URL
          const saved = await window.electronAPI.saveDroppedFile(f);
          if (!saved) continue;
          // decide how to insert: if image mime type, insert <img>, otherwise insert link
          const lower = (f.type || '').toLowerCase();
          if (lower.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name)) {
            this.insertImageAtSelection(saved, f.name);
          } else {
            const a = document.createElement('a');
            a.href = saved;
            a.textContent = f.name;
            a.target = '_blank';
            try {
              const sel = window.getSelection();
              if (
                sel &&
                sel.rangeCount &&
                this.richEditor.contains(sel.getRangeAt(0).commonAncestorContainer)
              ) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(a);
                range.setStartAfter(a);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              } else {
                this.richEditor.appendChild(a);
              }
            } catch (err) {
              this.richEditor.appendChild(a);
            }
          }
          this.trackContentChanges();
        } catch (err) {
          console.error('Drop handling failed for', f, err);
        }
      }
    });
  }
}
