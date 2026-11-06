// Blocks in the rich editor (lists, task lists, code blocks, tables): inserting them, typing in
// them and getting out of them. The caret can always reach a line above or below any block.

const BLOCKS = 'pre, table, ul, ol, blockquote, hr, .checklist';
const ZW = '​';

export class EditorBlocksFeature {
  // The editor's direct child that holds a node
  topBlockOf(node) {
    let el = node && node.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    while (el && el.parentElement !== this.richEditor) el = el.parentElement;
    return el && el.parentElement === this.richEditor ? el : null;
  }

  caretRange() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    return this.richEditor.contains(range.startContainer) ? range : null;
  }

  placeCaret(node, offset = 0) {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    this.richEditor.focus();
    this.captureEditorSelection();
  }

  placeCaretAtEnd(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    this.richEditor.focus();
    this.captureEditorSelection();
  }

  newParagraph() {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    return p;
  }

  // A paragraph right after (or before) a block, reusing an empty one that is already there
  paragraphNextTo(block, before = false) {
    const sibling = before ? block.previousElementSibling : block.nextElementSibling;
    if (sibling && sibling.tagName === 'P' && !sibling.textContent.trim()) {
      if (!sibling.firstChild) sibling.innerHTML = '<br>';
      return sibling;
    }
    const p = this.newParagraph();
    block.parentNode.insertBefore(p, before ? block : block.nextSibling);
    return p;
  }

  // Insert a block at the caret on its own line: the line it is in is split around it (an empty
  // line is replaced), and a line follows it. Done by hand: the browser's insertHTML turns a
  // block inside a paragraph into styled inline text.
  insertBlockAtCaret(html) {
    this.restoreEditorSelection();
    this.richEditor.focus();
    if (!this.caretRange()) this.placeCaretAtEnd(this.richEditor);
    const range = this.caretRange();
    range.deleteContents();

    const holder = document.createElement('div');
    holder.innerHTML = html;
    const block = holder.firstElementChild;
    const line = this.topBlockOf(range.startContainer);

    if (!line) {
      range.insertNode(block);
    } else if (line.matches(BLOCKS)) {
      line.after(block);
    } else {
      // Move what follows the caret into a copy of the line after the block
      const tail = document.createRange();
      tail.setStart(range.startContainer, range.startOffset);
      tail.setEnd(line, line.childNodes.length);
      const rest = tail.extractContents();
      line.after(block);
      const hasContent = (el) => el.textContent.trim() || el.querySelector?.('img');
      if (rest.textContent.trim() || rest.querySelector('img')) {
        const after = line.cloneNode(false);
        after.appendChild(rest);
        block.after(after);
      }
      if (!hasContent(line)) line.remove();
    }
    this.paragraphNextTo(block);
    return block;
  }

  // Text left directly in the editor (e.g. a list item turned back into a line) goes into a
  // paragraph, so every line is a block
  wrapLooseText() {
    let run = [];
    const flush = () => {
      if (
        run.some((n) => n.textContent.trim() || n.nodeName === 'IMG' || n.querySelector?.('img'))
      ) {
        const p = document.createElement('p');
        run[0].before(p);
        run.forEach((n) => p.appendChild(n));
      }
      run = [];
    };
    [...this.richEditor.childNodes].forEach((node) => {
      const inline =
        node.nodeType === Node.TEXT_NODE ||
        (node.nodeType === Node.ELEMENT_NODE &&
          getComputedStyle(node).display.startsWith('inline'));
      if (inline) run.push(node);
      else {
        // A <br> right after loose text belongs to that line
        if (node.nodeName === 'BR' && run.length) {
          run.push(node);
          flush();
          return;
        }
        flush();
      }
    });
    flush();
  }

  // How many characters of `el` come before the caret
  textOffsetIn(el, range) {
    const before = document.createRange();
    before.setStart(el, 0);
    before.setEnd(range.startContainer, range.startOffset);
    return before.toString().length;
  }

  placeCaretAtTextOffset(el, offset) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let left = offset;
    let node = walker.nextNode();
    while (node) {
      if (left <= node.length) {
        this.placeCaret(node, left);
        return;
      }
      left -= node.length;
      node = walker.nextNode();
    }
    this.placeCaretAtEnd(el);
  }

  // Chromium puts a list made from a paragraph inside that paragraph; lift it out
  liftListsOutOfParagraphs() {
    this.richEditor.querySelectorAll('p > ul, p > ol').forEach((list) => {
      const p = list.parentElement;
      const before = p.cloneNode(false);
      const after = p.cloneNode(false);
      let seen = false;
      [...p.childNodes].forEach((child) => {
        if (child === list) seen = true;
        else (seen ? after : before).appendChild(child);
      });
      p.replaceWith(...[before, list, after].filter((el) => el === list || el.textContent.trim()));
    });
  }

  // ============ Code block ============
  insertCodeBlockInRich() {
    const block = this.insertBlockAtCaret(`<pre><code>${ZW}</code></pre>`);
    if (!block) return;
    this.placeCaret(block.querySelector('code').firstChild, 1);
    this.trackContentChanges();
  }

  // Enter on an empty last line of a code block leaves it; Backspace in an empty one removes it
  handleCodeKeys(e, range) {
    const pre =
      range.startContainer.parentElement?.closest('pre') ||
      (range.startContainer.nodeType === Node.ELEMENT_NODE && range.startContainer.closest('pre'));
    if (!pre || !this.richEditor.contains(pre)) return false;
    const text = pre.textContent.replace(new RegExp(ZW, 'g'), '');

    if (e.key === 'Backspace' && !text) {
      e.preventDefault();
      // The caret goes back to the end of the line above, or to the line below
      const prev = pre.previousElementSibling;
      const next = pre.nextElementSibling;
      pre.remove();
      // The empty line that came with the block goes with it
      if (prev && next && next.tagName === 'P' && !next.textContent.trim()) next.remove();
      if (prev && !prev.matches(BLOCKS)) this.placeCaretAtEnd(prev);
      else if (next && next.tagName === 'P') this.placeCaret(next, 0);
      else {
        const p = this.newParagraph();
        if (prev) prev.after(p);
        else this.richEditor.prepend(p);
        this.placeCaret(p, 0);
      }
      this.trackContentChanges();
      return true;
    }

    if (e.key === 'Enter' && !e.shiftKey && !(e.ctrlKey || e.metaKey)) {
      // Text after the caret, without markers: nothing means the caret is on the last line
      const after = document.createRange();
      after.setStart(range.endContainer, range.endOffset);
      after.setEnd(pre, pre.childNodes.length);
      const rest = after.toString().replace(new RegExp(ZW, 'g'), '');
      const before = document.createRange();
      before.setStart(pre, 0);
      before.setEnd(range.startContainer, range.startOffset);
      const head = before.toString().replace(new RegExp(ZW, 'g'), '');
      if (!rest && (head.endsWith('\n') || !head)) {
        e.preventDefault();
        // Drop the empty last line and continue below the block
        const code = pre.querySelector('code') || pre;
        code.textContent = head.replace(/\n$/, '') || ZW;
        const p = this.paragraphNextTo(pre);
        this.placeCaret(p, 0);
        this.trackContentChanges();
        return true;
      }
    }
    return false;
  }

  // ============ Lists ============
  insertList(type) {
    this.restoreEditorSelection();
    this.richEditor.focus();
    if (!this.caretRange()) this.placeCaretAtEnd(this.richEditor);
    // The caret's place in its line, as a text position: the command moves it to the start
    const lineOf = (r) =>
      r && (r.startContainer.parentElement?.closest('li') || this.topBlockOf(r.startContainer));
    const before = this.caretRange();
    const at = lineOf(before) ? this.textOffsetIn(lineOf(before), before) : 0;
    // The line(s) at the caret become a list, or stop being one
    document.execCommand(type === 'ol' ? 'insertOrderedList' : 'insertUnorderedList');
    const line = lineOf(this.caretRange());
    this.liftListsOutOfParagraphs();
    this.wrapLooseText();
    if (line && this.richEditor.contains(line)) this.placeCaretAtTextOffset(line, at);
    this.trackContentChanges();
    this.captureEditorSelection();
  }

  // Enter on an empty list item ends the list there with a line below it
  handleListKeys(e, range) {
    if (e.key !== 'Enter' || e.shiftKey) return false;
    const li =
      range.startContainer.parentElement?.closest('li') ||
      (range.startContainer.nodeType === Node.ELEMENT_NODE && range.startContainer.closest('li'));
    if (!li || !this.richEditor.contains(li) || li.textContent.trim()) return false;
    const list = li.parentElement;
    // Only a list directly in the note; nested lists keep the browser's outdent
    if (list.parentElement !== this.richEditor) return false;
    e.preventDefault();
    const rest = [];
    let next = li.nextElementSibling;
    while (next) {
      rest.push(next);
      next = next.nextElementSibling;
    }
    const p = this.newParagraph();
    list.after(p);
    if (rest.length) {
      const tail = list.cloneNode(false);
      rest.forEach((item) => tail.appendChild(item));
      p.after(tail);
    }
    li.remove();
    if (!list.children.length) list.remove();
    this.placeCaret(p, 0);
    this.trackContentChanges();
    return true;
  }

  // ============ Cutting a line ============
  // Ctrl+X with nothing selected cuts the line the caret is on, as code editors do: it goes to the
  // clipboard (with its formatting) and out of the note, and the caret moves to the next line. A
  // line is a paragraph or heading, one item of a list or task list, or one line of a code block;
  // in a table nothing is cut (the whole table would go).
  handleCutLine(e, range) {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return false;
    if (e.key.toLowerCase() !== 'x' || !range.collapsed) return false;
    const el =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer
        : range.startContainer.parentElement;
    if (!el || el.closest('table')) return false;
    const pre = el.closest('pre');
    if (pre && this.richEditor.contains(pre)) return this.cutCodeLine(e, range);
    const item = el.closest('li, .checklist-item');
    const line = item && this.richEditor.contains(item) ? item : this.topBlockOf(el);
    if (!line) return false;
    e.preventDefault();

    // Copy it as the browser copies a selection (text and formatting)
    const sel = window.getSelection();
    const all = document.createRange();
    all.selectNodeContents(
      line.matches('.checklist-item') ? line.querySelector('label') || line : line
    );
    sel.removeAllRanges();
    sel.addRange(all);
    document.execCommand('copy');

    // Remove it, and a list or task list it leaves empty; the caret goes to the next line
    const next = line.nextElementSibling;
    const previous = line.previousElementSibling;
    let container = line.parentElement;
    let after = next;
    let before = previous;
    line.remove();
    while (
      container &&
      container !== this.richEditor &&
      container.matches('ul, ol, .checklist') &&
      !container.children.length
    ) {
      const parent = container.parentElement;
      after = after || container.nextElementSibling;
      before = before || container.previousElementSibling;
      container.remove();
      container = parent;
    }
    if (!this.richEditor.textContent.trim() && !this.richEditor.querySelector('img, hr, table')) {
      this.richEditor.innerHTML = '<p><br></p>';
      after = this.richEditor.firstChild;
    }
    const target = (after?.isConnected && after) || (before?.isConnected && before) || null;
    if (target) {
      // Into the line itself: the first item of a list, the text of a task
      const inner = target.matches('ul, ol, .checklist')
        ? target.querySelector('li, .checklist-item') || target
        : target;
      const spot = inner.matches('.checklist-item') ? inner.querySelector('label') || inner : inner;
      if (target === after) this.placeCaret(spot, 0);
      else this.placeCaretAtEnd(spot);
    }
    this.updateWordCount?.();
    this.trackContentChanges();
    return true;
  }

  // One line of a code block: its text up to and with its line break, cut by the browser (so it
  // goes to the clipboard and can be undone)
  cutCodeLine(e, range) {
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return false;
    const text = node.nodeValue;
    const start = text.lastIndexOf('\n', range.startOffset - 1) + 1;
    let end = text.indexOf('\n', range.startOffset);
    end = end < 0 ? text.length : end + 1;
    if (start === end) return false;
    const line = document.createRange();
    line.setStart(node, start);
    line.setEnd(node, end);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(line);
    // The browser's own cut follows the key press, on this selection
    return false;
  }

  // ============ Task list ============
  checklistItemHtml(content = '<br>') {
    const id = 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    return `<div class="checklist-item"><input type="checkbox" id="${id}"><label for="${id}">${content}</label></div>`;
  }

  // The line at the caret becomes a task; in a task, it becomes a line again
  insertChecklist() {
    this.restoreEditorSelection();
    this.richEditor.focus();
    const range = this.caretRange();
    const item = range && range.startContainer.parentElement?.closest('.checklist-item');
    if (item) {
      this.checklistItemToParagraph(item);
      return;
    }
    const line = range && this.topBlockOf(range.startContainer);
    if (line && (line.tagName === 'P' || line.tagName === 'DIV') && !line.matches(BLOCKS)) {
      const content = line.innerHTML.trim() && line.textContent.trim() ? line.innerHTML : '<br>';
      const list = document.createElement('div');
      list.className = 'checklist';
      list.innerHTML = this.checklistItemHtml(content);
      line.replaceWith(list);
      this.paragraphNextTo(list);
      this.placeCaretAtEnd(list.querySelector('label'));
    } else {
      const list = this.insertBlockAtCaret(
        `<div class="checklist">${this.checklistItemHtml()}</div>`
      );
      if (list) this.placeCaret(list.querySelector('label'), 0);
    }
    this.trackContentChanges();
  }

  // Deleting across tasks (everything selected and deleted, a cut) can leave a task without its
  // checkbox or its text, or a task list with no tasks; what is typed next would go into that
  // half task. Such leftovers become plain lines again, where they were, the caret kept in them.
  repairBrokenChecklists() {
    const ed = this.richEditor;
    const broken = [...ed.querySelectorAll('.checklist-item')].filter(
      (item) =>
        !item.querySelector(':scope > input[type="checkbox"]') ||
        !item.querySelector(':scope > label')
    );
    const emptyLists = () =>
      [...ed.querySelectorAll('.checklist')].filter((l) => !l.querySelector('.checklist-item'));
    if (!broken.length && !emptyLists().length) return;
    const sel = window.getSelection();
    const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    let caretLine = null;
    broken.forEach((item) => {
      const line = document.createElement('p');
      const source = item.querySelector(':scope > label') || item;
      [...source.childNodes].forEach((node) => {
        if (!(node.nodeType === Node.ELEMENT_NODE && node.matches('input[type="checkbox"]'))) {
          line.appendChild(node);
        }
      });
      if (!line.textContent.trim() && !line.querySelector('img')) line.innerHTML = '<br>';
      if (range && item.contains(range.startContainer)) caretLine = line;
      const list = item.parentElement?.classList.contains('checklist') ? item.parentElement : null;
      if (!list) {
        item.replaceWith(line);
        return;
      }
      // The tasks after it stay a task list, below the line
      const after = [];
      for (let next = item.nextSibling; next; next = next.nextSibling) after.push(next);
      list.after(line);
      if (after.length) {
        const rest = list.cloneNode(false);
        after.forEach((node) => rest.appendChild(node));
        line.after(rest);
      }
      item.remove();
    });
    // A task list left with no tasks gives up what is in it (or goes)
    emptyLists().forEach((list) => list.replaceWith(...list.childNodes));
    // Nothing left but empty lines (everything was deleted): one empty line, as in a new note
    const blankLine = (el) =>
      el.nodeType === Node.ELEMENT_NODE && el.tagName === 'P' && !el.querySelector(':not(br)');
    if (!ed.textContent.trim() && [...ed.childNodes].every(blankLine)) {
      ed.innerHTML = '<p><br></p>';
      caretLine = ed.firstChild;
    }
    if (caretLine && caretLine.isConnected) this.placeCaretAtEnd(caretLine);
  }

  checklistItemToParagraph(item) {
    const list = item.closest('.checklist');
    const p = document.createElement('p');
    const label = item.querySelector('label');
    p.innerHTML = label && label.textContent.trim() ? label.innerHTML : '<br>';
    // Items after this one stay a task list below the new line
    const after = [];
    let next = item.nextElementSibling;
    while (next) {
      after.push(next);
      next = next.nextElementSibling;
    }
    // An empty line already below the list is used instead of adding another
    const below = list.nextElementSibling;
    if (!after.length && below && below.tagName === 'P' && !below.textContent.trim()) {
      below.remove();
    }
    list.parentNode.insertBefore(p, list.nextSibling);
    if (after.length) {
      const rest = document.createElement('div');
      rest.className = 'checklist';
      after.forEach((el) => rest.appendChild(el));
      p.after(rest);
    }
    item.remove();
    if (!list.querySelector('.checklist-item')) list.remove();
    this.placeCaretAtEnd(p);
    this.trackContentChanges();
  }

  // Enter in a task makes the next task (an empty one ends the list); Backspace at the start of
  // an empty task turns it into a line
  handleChecklistKeys(e, range) {
    const item =
      range.startContainer.parentElement?.closest('.checklist-item') ||
      (range.startContainer.nodeType === Node.ELEMENT_NODE &&
        range.startContainer.closest('.checklist-item'));
    if (!item || !this.richEditor.contains(item)) return false;
    const label = item.querySelector('label');
    const empty = !label || !label.textContent.trim();

    if (e.key === 'Backspace' && empty && range.collapsed) {
      e.preventDefault();
      this.checklistItemToParagraph(item);
      return true;
    }
    if (e.key !== 'Enter' || e.shiftKey) return false;
    e.preventDefault();
    if (empty) {
      this.checklistItemToParagraph(item);
      return true;
    }
    // Split the task at the caret: what is after it goes into the new task
    const tail = document.createRange();
    tail.setStart(range.endContainer, range.endOffset);
    tail.setEnd(label, label.childNodes.length);
    const moved = tail.extractContents();
    range.deleteContents();
    const holder = document.createElement('div');
    holder.innerHTML = this.checklistItemHtml();
    const next = holder.firstElementChild;
    const nextLabel = next.querySelector('label');
    if (moved.textContent) {
      nextLabel.innerHTML = '';
      nextLabel.appendChild(moved);
    }
    if (!label.textContent) label.innerHTML = '<br>';
    item.after(next);
    this.placeCaret(nextLabel, 0);
    this.trackContentChanges();
    return true;
  }

  // ============ Table ============
  // Tab moves to the next cell (a new row after the last one), Shift+Tab to the previous one
  handleTableKeys(e, range) {
    if (e.key !== 'Tab') return false;
    const cell =
      range.startContainer.parentElement?.closest('td, th') ||
      (range.startContainer.nodeType === Node.ELEMENT_NODE &&
        range.startContainer.closest('td, th'));
    if (!cell || !this.richEditor.contains(cell)) return false;
    e.preventDefault();
    const table = cell.closest('table');
    const cells = [...table.querySelectorAll('td, th')];
    let index = cells.indexOf(cell) + (e.shiftKey ? -1 : 1);
    if (index < 0) return true;
    if (index >= cells.length) {
      const lastRow = cell.closest('tr');
      const row = lastRow.cloneNode(true);
      row.querySelectorAll('td, th').forEach((c) => {
        const td = document.createElement('td');
        td.setAttribute('style', c.getAttribute('style') || 'padding:6px');
        td.innerHTML = '<br>';
        c.replaceWith(td);
      });
      lastRow.after(row);
      this.placeCaret(row.firstElementChild, 0);
      this.trackContentChanges();
      return true;
    }
    this.placeCaretAtEnd(cells[index]);
    return true;
  }

  // ============ Getting past a block ============
  // ArrowDown/ArrowUp that cannot move (the caret is in the last/first block) makes a line there
  handleEdgeArrows(e) {
    if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || e.shiftKey) return;
    const range = this.caretRange();
    if (!range) return;
    const down = e.key === 'ArrowDown';
    const block = this.topBlockOf(range.startContainer);
    if (!block || !block.matches(BLOCKS)) return;
    const edge = down ? this.richEditor.lastElementChild : this.richEditor.firstElementChild;
    if (block !== edge) return;
    const before = { node: range.startContainer, offset: range.startOffset };
    // Let the caret move inside the block first; only when it stayed put add the line
    setTimeout(() => {
      const now = this.caretRange();
      if (!now || now.startContainer !== before.node || now.startOffset !== before.offset) return;
      const p = this.paragraphNextTo(block, !down);
      this.placeCaret(p, 0);
    }, 0);
  }

  // A click in the empty space below the last block puts the caret on a new line there
  handleClickBelow(e) {
    if (e.target !== this.richEditor) return;
    const last = this.richEditor.lastElementChild;
    if (!last || !last.matches(BLOCKS)) return;
    if (e.clientY <= last.getBoundingClientRect().bottom) return;
    e.preventDefault();
    const p = this.paragraphNextTo(last);
    this.placeCaret(p, 0);
  }

  // Text typed straight into the note (an empty note, or older notes) goes into a paragraph, so
  // every line is a block the line tools and shortcuts can work on
  wrapLooseLineAtCaret() {
    const range = this.caretRange();
    if (!range || this.topBlockOf(range.startContainer)) return;
    const offset = this.textOffsetIn(this.richEditor, range);
    this.wrapLooseText();
    this.placeCaretAtTextOffset(this.richEditor, offset);
  }

  setupBlockEvents() {
    // New lines are paragraphs (the browser's default is <div>)
    document.execCommand('defaultParagraphSeparator', false, 'p');
    // The first keystroke in an empty note goes into a paragraph
    this.richEditor.addEventListener('beforeinput', (e) => {
      if (!e.inputType.startsWith('insert') || this.richEditor.firstElementChild) return;
      if (this.richEditor.textContent.trim()) return;
      this.richEditor.innerHTML = '<p><br></p>';
      this.placeCaret(this.richEditor.firstChild, 0);
    });
    this.richEditor.addEventListener('input', () => this.repairBrokenChecklists(), true);
    this.richEditor.addEventListener('input', () => this.wrapLooseLineAtCaret(), true);

    // Toolbar buttons keep the caret in the note (a pressed button would take the focus)
    document.querySelectorAll('.formatting-toolbar button').forEach((btn) => {
      btn.addEventListener('mousedown', (e) => e.preventDefault());
    });

    // Runs before the other key handlers of the editor
    this.richEditor.addEventListener(
      'keydown',
      (e) => {
        const range = this.caretRange();
        if (range) {
          const handled =
            this.handleCutLine(e, range) ||
            this.handleCodeKeys(e, range) ||
            this.handleChecklistKeys(e, range) ||
            this.handleListKeys(e, range) ||
            this.handleTableKeys(e, range);
          if (handled) {
            e.stopImmediatePropagation();
            return;
          }
        }
        this.handleEdgeArrows(e);
      },
      true
    );

    this.richEditor.addEventListener('mousedown', (e) => this.handleClickBelow(e));

    // Clicking a task's text places the caret; only the box itself ticks it
    this.richEditor.addEventListener('click', (e) => {
      if (e.target.closest('.checklist-item label')) e.preventDefault();
    });
  }
}
