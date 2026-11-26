// The Markdown toolbar of a .md file note: its buttons write the Markdown syntax into the file's
// text (headings, bold, italic, lists, links, code, quotes, tables), on the selection or the lines
// of the caret. A press on a button already applied takes the syntax off again. Ctrl+B and Ctrl+I
// do bold and italic in that text.

const WRAPS = { bold: '**', italic: '*', strike: '~~', code: '`' };
const TABLE = '| Başlık | Başlık |\n| --- | --- |\n| Hücre | Hücre |\n';
const LINE_MARK = {
  h1: () => '# ',
  h2: () => '## ',
  h3: () => '### ',
  ul: () => '- ',
  ol: (i) => `${i + 1}. `,
  task: () => '- [ ] ',
  quote: () => '> ',
};

export class MarkdownToolbarFeature {
  setupMarkdownToolbar() {
    const area = this.markdownEditor;
    const bar = document.querySelector('#noteEditor .md-toolbar');
    if (!area || !bar) return;
    bar.querySelectorAll('button').forEach((btn) => {
      // The caret stays in the text
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => this.applyMarkdown(btn.dataset.md));
    });
    area.addEventListener('keydown', (e) => {
      if (!this.isMarkdownFileNote() || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key !== 'b' && key !== 'i') return;
      e.preventDefault();
      this.applyMarkdown(key === 'b' ? 'bold' : 'italic');
    });
  }

  isMarkdownFileNote() {
    const note = this.currentNote;
    return !!note?.filePath && note.fileKind === 'md';
  }

  // Replace the text between two places (the browser's own insertion, so undo still works), then
  // select selStart..selEnd
  replaceMarkdownRange(area, start, end, text, selStart, selEnd) {
    area.focus();
    area.setSelectionRange(start, end);
    if (!document.execCommand('insertText', false, text)) {
      area.setRangeText(text, start, end, 'end');
      area.dispatchEvent(new Event('input', { bubbles: true }));
    }
    area.setSelectionRange(selStart, selEnd);
  }

  applyMarkdown(action) {
    const area = this.markdownEditor;
    if (!area || !this.isMarkdownFileNote()) return;
    if (WRAPS[action]) return this.wrapMarkdown(area, WRAPS[action]);
    if (LINE_MARK[action]) return this.prefixMarkdownLines(area, action);
    if (action === 'link') return this.linkMarkdown(area);
    if (action === 'codeblock') return this.fenceMarkdown(area);
    if (action === 'table') return this.insertMarkdownBlock(area, TABLE);
    if (action === 'hr') return this.insertMarkdownBlock(area, '---\n');
  }

  // **bold** and the like around the selection; already around it, taken off. Nothing selected:
  // the marks go in with the caret between them.
  wrapMarkdown(area, mark) {
    const { selectionStart: a, selectionEnd: b, value } = area;
    const n = mark.length;
    const selected = value.slice(a, b);
    if (value.slice(a - n, a) === mark && value.slice(b, b + n) === mark) {
      return this.replaceMarkdownRange(area, a - n, b + n, selected, a - n, b - n);
    }
    if (selected.length > 2 * n && selected.startsWith(mark) && selected.endsWith(mark)) {
      const inner = selected.slice(n, -n);
      return this.replaceMarkdownRange(area, a, b, inner, a, a + inner.length);
    }
    this.replaceMarkdownRange(area, a, b, mark + selected + mark, a + n, a + n + selected.length);
  }

  // A mark at the start of each line the selection touches (a line's other mark is replaced);
  // every line already having this one: taken off
  prefixMarkdownLines(area, action) {
    const { selectionStart: a, selectionEnd: b, value } = area;
    const from = value.lastIndexOf('\n', a - 1) + 1;
    let to = value.indexOf('\n', b > a && value[b - 1] === '\n' ? b - 1 : b);
    if (to < 0) to = value.length;
    const lines = value.slice(from, to).split('\n');
    const strip = (line) => line.replace(/^(#{1,6} |[-*+] \[[ xX]\] |[-*+] |\d+[.)] |> ?)/, '');
    const filled = lines.filter((l) => l.trim());
    const off =
      filled.length > 0 &&
      filled.every((line, i) => line.startsWith(LINE_MARK[action](i)) && line !== strip(line));
    let n = 0;
    const out = lines
      .map((line) => {
        if (!line.trim()) return line;
        const body = strip(line);
        const text = off ? body : LINE_MARK[action](n) + body;
        n += 1;
        return text;
      })
      .join('\n');
    this.replaceMarkdownRange(area, from, to, out, from, from + out.length);
  }

  linkMarkdown(area) {
    const { selectionStart: a, selectionEnd: b, value } = area;
    const text = value.slice(a, b) || 'metin';
    // The address is selected, to be typed over
    const at = a + text.length + 3;
    this.replaceMarkdownRange(area, a, b, `[${text}](adres)`, at, at + 5);
  }

  // A fenced block around the selection (or an empty one with the caret inside)
  fenceMarkdown(area) {
    const { selectionStart: a, selectionEnd: b, value } = area;
    const body = value.slice(a, b);
    const lead = a > 0 && value[a - 1] !== '\n' ? '\n' : '';
    const out = `${lead}\`\`\`\n${body}\n\`\`\`\n`;
    const at = a + lead.length + 4;
    this.replaceMarkdownRange(area, a, b, out, at, at + body.length);
  }

  // A block on lines of its own (a table, a rule) at the caret
  insertMarkdownBlock(area, block) {
    const { selectionStart: a, selectionEnd: b, value } = area;
    let lead = '';
    if (a > 0 && value[a - 1] !== '\n') lead = '\n\n';
    else if (a > 1 && value[a - 2] !== '\n') lead = '\n';
    const end = a + lead.length + block.length;
    this.replaceMarkdownRange(area, a, b, lead + block, end, end);
  }
}
