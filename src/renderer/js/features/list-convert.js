// Turning lines into a bulleted list, a numbered list or a task list, and back. Every line the
// selection touches is converted on its own: a list item, a task, a paragraph or a heading, and
// each line of a paragraph split by line breaks. Nothing is merged into one line and nothing is
// dropped. When every touched line already is of that kind, they become plain lines again.
//
// A line is { kind: 'ul' | 'ol' | 'task' | 'p', html, checked, tag } (tag: the paragraph's or
// heading's own tag, kept for lines that stay as they are).

const LINE_BLOCKS = /^(P|DIV|H[1-6])$/;

export class ListConvertFeature {
  // Which of two points in the note comes first: < 0 when (a, aOffset) is before (b, bOffset)
  comparePoints(a, aOffset, b, bOffset) {
    const at = document.createRange();
    at.setStart(a, aOffset);
    return -at.comparePoint(b, bOffset);
  }

  // Whether a line (from one point to another) takes part in the range: a selection overlaps it,
  // a caret is in it or on its edges
  rangeTouches(range, startNode, startOffset, endNode, endOffset) {
    const { startContainer: s, startOffset: so, endContainer: e, endOffset: eo } = range;
    if (range.collapsed) {
      return (
        this.comparePoints(startNode, startOffset, s, so) <= 0 &&
        this.comparePoints(endNode, endOffset, s, so) >= 0
      );
    }
    return (
      this.comparePoints(startNode, startOffset, e, eo) < 0 &&
      this.comparePoints(endNode, endOffset, s, so) > 0
    );
  }

  htmlOf(nodes) {
    const box = document.createElement('div');
    nodes.forEach((node) => box.appendChild(node.cloneNode(true)));
    return box.innerHTML;
  }

  isBlank(html) {
    const box = document.createElement('div');
    box.innerHTML = html;
    return !box.textContent.trim() && !box.querySelector('img');
  }

  // The lines of one block of the note, each marked when the selection touches it
  linesOfBlock(block, range) {
    const lines = [];
    if (block.matches('ul, ol')) {
      // Its items; an item's own sub-list goes with it (so untouched indented items stay as they are)
      const kind = block.tagName === 'OL' ? 'ol' : 'ul';
      block.querySelectorAll(':scope > li').forEach((li) => {
        const isSub = (n) => n.nodeType === 1 && n.matches('ul, ol');
        lines.push({
          kind,
          html: this.htmlOf([...li.childNodes].filter((n) => !isSub(n))),
          sub: this.htmlOf([...li.childNodes].filter(isSub)),
          touched: this.rangeTouches(range, li, 0, li, li.childNodes.length),
        });
      });
      return lines;
    }
    if (block.matches('.checklist')) {
      block.querySelectorAll('.checklist-item').forEach((item) => {
        const label = item.querySelector(':scope > label');
        const box = item.querySelector(':scope > input[type="checkbox"]');
        lines.push({
          kind: 'task',
          html: label ? label.innerHTML : '',
          checked: !!box?.checked,
          touched: this.rangeTouches(range, item, 0, item, item.childNodes.length),
        });
      });
      return lines;
    }
    if (LINE_BLOCKS.test(block.tagName) && !block.matches('.checklist, .checklist-item')) {
      // A paragraph's lines, split at its line breaks
      const kids = [...block.childNodes];
      let start = 0;
      const push = (end) => {
        const nodes = kids.slice(start, end);
        lines.push({
          kind: 'p',
          tag: block.tagName,
          html: this.htmlOf(nodes),
          touched: this.rangeTouches(range, block, start, block, end),
        });
      };
      kids.forEach((node, i) => {
        if (node.nodeName === 'BR' && i < kids.length - 1) {
          push(i);
          start = i + 1;
        }
      });
      push(kids.length && kids[kids.length - 1].nodeName === 'BR' ? kids.length - 1 : kids.length);
      return lines;
    }
    return null;
  }

  // Build the nodes for a run of lines of one kind
  buildRun(kind, lines) {
    const content = (html) => (this.isBlank(html) ? '<br>' : html);
    if (kind === 'code') {
      // One code block, a line of text per line (the formatting goes)
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      const text = (html) => {
        const box = document.createElement('div');
        box.innerHTML = (html || '').replace(/<br\s*\/?>/gi, '\n');
        return box.textContent;
      };
      code.textContent =
        lines.map((line) => text(line.html) + (line.sub ? '\n' + text(line.sub) : '')).join('\n') ||
        '\u200b';
      pre.appendChild(code);
      return [pre];
    }
    if (kind === 'ul' || kind === 'ol') {
      const list = document.createElement(kind);
      lines.forEach((line) => {
        const li = document.createElement('li');
        li.innerHTML = content(line.html) + (line.sub || '');
        list.appendChild(li);
      });
      return [list];
    }
    // A task or a plain line cannot hold a list: an item's sub-list follows it as a list of its own
    const withSub = lines.findIndex((line) => line.sub);
    if (withSub !== -1 && withSub < lines.length) {
      const head = this.buildRun(
        kind,
        lines.slice(0, withSub + 1).map((l, i) => (i === withSub ? { ...l, sub: '' } : l))
      );
      const box = document.createElement('div');
      box.innerHTML = lines[withSub].sub;
      const rest = lines.slice(withSub + 1);
      return [...head, ...box.children, ...(rest.length ? this.buildRun(kind, rest) : [])];
    }
    if (kind === 'task') {
      const list = document.createElement('div');
      list.className = 'checklist';
      list.innerHTML = lines.map((line) => this.checklistItemHtml(content(line.html))).join('');
      [...list.querySelectorAll('input[type="checkbox"]')].forEach((box, i) => {
        if (lines[i].checked) {
          box.checked = true;
          box.setAttribute('checked', 'checked');
        }
      });
      return [list];
    }
    // Plain lines: lines that stayed as they were keep their paragraph (joined by line breaks);
    // converted ones are a paragraph each
    if (lines[0].keepTogether) {
      const p = document.createElement(lines[0].tag || 'P');
      p.innerHTML = lines.map((line) => line.html).join('<br>') || '<br>';
      if (this.isBlank(p.innerHTML) && !p.querySelector('br')) p.innerHTML = '<br>';
      return [p];
    }
    return lines.map((line) => {
      const p = document.createElement(line.tag && line.tag !== 'DIV' ? line.tag : 'P');
      p.innerHTML = content(line.html);
      return p;
    });
  }

  // The element that holds a converted line's text (for the caret and the selection)
  lineTextHolders(nodes, kind) {
    const holders = [];
    nodes.forEach((node) => {
      if (kind === 'code') holders.push(node.querySelector('code') || node);
      else if (kind === 'task') holders.push(...node.querySelectorAll('.checklist-item > label'));
      else if (kind === 'ul' || kind === 'ol')
        holders.push(...node.querySelectorAll(':scope > li'));
      else holders.push(node);
    });
    return holders;
  }

  // A list next to one of the same kind becomes one list; code blocks side by side one block
  mergeWithNeighbours(node) {
    if (node.matches('pre')) {
      const join = (first, second) => {
        const a = first.querySelector('code') || first;
        const b = second.querySelector('code') || second;
        a.textContent = `${a.textContent.replace(/\u200b/g, '')}
${b.textContent.replace(/\u200b/g, '')}`;
        second.remove();
      };
      const prev = node.previousElementSibling;
      if (prev?.matches('pre') && this.convertedCode?.has(prev)) {
        join(prev, node);
        return;
      }
      return;
    }
    const same = (a, b) =>
      a &&
      b &&
      ((a.matches('ul') && b.matches('ul')) ||
        (a.matches('ol') && b.matches('ol')) ||
        (a.matches('.checklist') && b.matches('.checklist')));
    let current = node;
    const prev = current.previousElementSibling;
    if (same(prev, current)) {
      while (current.firstChild) prev.appendChild(current.firstChild);
      current.remove();
      current = prev;
    }
    const next = current.nextElementSibling;
    if (same(current, next)) {
      while (next.firstChild) current.appendChild(next.firstChild);
      next.remove();
    }
  }

  // Convert the lines the selection (or the caret) touches into `target`: 'ul', 'ol' or 'task'.
  // False when the selection is not in lines that can be converted (a table, a code block).
  convertLines(target) {
    const range = this.caretRange();
    if (!range) return false;
    const ed = this.richEditor;
    const inside = (
      range.startContainer.nodeType === 1
        ? range.startContainer
        : range.startContainer.parentElement
    )?.closest('td, th, pre, summary');
    if (inside && ed.contains(inside)) return false;
    this.wrapLooseText();

    // The note's blocks the selection reaches, in order
    const blocks = [...ed.children].filter((block) =>
      range.collapsed
        ? block.contains(range.startContainer) ||
          (range.startContainer === ed && ed.childNodes[range.startOffset] === block)
        : range.intersectsNode(block)
    );
    if (!blocks.length) return false;
    const parsed = blocks.map((block) => ({ block, lines: this.linesOfBlock(block, range) }));
    const touched = parsed.flatMap(({ lines }) => (lines || []).filter((l) => l.touched));
    if (!touched.length) return false;

    // Already all of this kind: back to plain lines (a code block is made, never undone here)
    const result =
      target !== 'code' && touched.every((line) => line.kind === target) ? 'p' : target;
    const caretLine = range.collapsed ? touched[0] : null;
    const caretOffset = caretLine ? this.caretOffsetInLine(range) : 0;

    const converted = [];
    parsed.forEach(({ block, lines }) => {
      if (!lines || !lines.some((l) => l.touched)) return;
      // Runs: untouched lines keep their kind, touched ones take the new kind
      const runs = [];
      lines.forEach((line) => {
        const kind = line.touched ? result : line.kind;
        const keepTogether = !line.touched && line.kind === 'p';
        const last = runs[runs.length - 1];
        const entry = { ...line, keepTogether };
        if (last && last.kind === kind && last.touched === line.touched) last.lines.push(entry);
        else runs.push({ kind, touched: line.touched, lines: [entry] });
      });
      const nodes = runs.flatMap((run) => {
        const built = this.buildRun(run.kind, run.lines);
        if (run.touched) converted.push({ nodes: built, kind: run.kind });
        return built;
      });
      block.replaceWith(...nodes);
    });

    // Lists of the same kind side by side join (with the ones around them too); the code blocks
    // made now join one another (not a code block that was already there)
    this.convertedCode = new Set(
      converted.flatMap(({ nodes }) => nodes.filter((n) => n.matches('pre')))
    );
    converted.forEach(({ nodes }) =>
      nodes.forEach((node) => node.isConnected && this.mergeWithNeighbours(node))
    );
    const holders = converted
      .flatMap(({ nodes, kind }) => this.lineTextHolders(nodes, kind))
      .filter((el) => el.isConnected);
    if (holders.length) {
      if (caretLine) this.placeCaretAtTextOffset(holders[0], caretOffset);
      else {
        const sel = window.getSelection();
        const r = document.createRange();
        r.setStart(holders[0], 0);
        r.setEnd(holders[holders.length - 1], holders[holders.length - 1].childNodes.length);
        sel.removeAllRanges();
        sel.addRange(r);
        this.captureEditorSelection();
      }
    }
    // A task list or code block at the very end gets a line below it, so the caret can leave it
    // (a list is left with Enter on an empty item)
    const lastBlock = ed.lastElementChild;
    if (lastBlock && lastBlock.matches('.checklist, pre')) this.paragraphNextTo(lastBlock);
    this.trackContentChanges();
    return true;
  }

  // How far into its own line the caret is (characters), to put it back there
  caretOffsetInLine(range) {
    const node = range.startContainer;
    const el = node.nodeType === 1 ? node : node.parentElement;
    const holder =
      el.closest('li, .checklist-item > label') ||
      (this.topBlockOf(node) && LINE_BLOCKS.test(this.topBlockOf(node).tagName)
        ? this.topBlockOf(node)
        : null);
    if (!holder) return 0;
    // In a paragraph split by line breaks: from the line break before the caret
    const before = document.createRange();
    before.setStart(holder, 0);
    before.setEnd(range.startContainer, range.startOffset);
    const text = before.cloneContents();
    const brs = text.querySelectorAll ? text.querySelectorAll('br') : [];
    if (brs.length && !holder.matches('li, label')) {
      const lastBr = brs[brs.length - 1];
      let count = 0;
      for (let n = lastBr.nextSibling; n; n = n.nextSibling) count += n.textContent.length;
      return count;
    }
    return before.toString().length;
  }
}
