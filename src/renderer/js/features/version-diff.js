// Comparing a version with the note as it is now: what was added since (green) and what was
// removed (red, crossed out), line by line, and word by word inside a changed line. Long runs of
// unchanged lines fold into one row that opens with a click.

import { i18n } from '../i18n.js';

const LINE_TAGS = /^(P|H[1-6]|LI|BLOCKQUOTE|PRE|TR|HR|DIV)$/;
const FOLD_AFTER = 3; // unchanged lines kept around a change; longer runs fold
const MAX_CELLS = 4000000; // beyond this (very long notes) the lines are compared in order only

// The longest common subsequence of a and b, as a list of [same | added | removed] steps
function diffSequences(a, b, same) {
  const n = a.length;
  const m = b.length;
  if (n * m > MAX_CELLS) {
    const steps = [];
    for (let i = 0; i < Math.max(n, m); i++) {
      if (i < n && i < m && same(a[i], b[i])) steps.push({ type: 'same', a: a[i], b: b[i] });
      else {
        if (i < n) steps.push({ type: 'removed', a: a[i] });
        if (i < m) steps.push({ type: 'added', b: b[i] });
      }
    }
    return steps;
  }
  const table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = same(a[i], b[j])
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const steps = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (same(a[i], b[j])) {
      steps.push({ type: 'same', a: a[i++], b: b[j++] });
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      steps.push({ type: 'removed', a: a[i++] });
    } else {
      steps.push({ type: 'added', b: b[j++] });
    }
  }
  while (i < n) steps.push({ type: 'removed', a: a[i++] });
  while (j < m) steps.push({ type: 'added', b: b[j++] });
  return steps;
}

export class VersionDiffFeature {
  // A note's text as lines: each paragraph, heading, list item, task (with its box), quote, code
  // line and table row is one; a divider and an image are lines too
  noteLines(html) {
    const body = this.parseInertHtml(html || '');
    const lines = [];
    const push = (text, kind = 'p') => lines.push({ text: text.replace(/\s+/g, ' ').trim(), kind });
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          if (child.data.trim()) push(child.data);
          return;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return;
        if (child.matches('.checklist-item')) {
          const done = child.querySelector('input[type="checkbox"]')?.hasAttribute('checked');
          push(`${done ? '☑' : '☐'} ${child.textContent}`, 'task');
          return;
        }
        if (child.tagName === 'HR') return push('———', 'hr');
        if (
          child.tagName === 'IMG' ||
          (child.querySelector?.('img') && !child.textContent.trim())
        ) {
          return push(`[${i18n.t('toolbar.image')}]`, 'image');
        }
        if (child.tagName === 'PRE') {
          child.textContent.split('\n').forEach((line) => line.trim() && push(line, 'code'));
          return;
        }
        if (child.tagName === 'TR') {
          return push([...child.cells].map((c) => c.textContent.trim()).join(' | '), 'row');
        }
        const hasBlocks = [...child.children].some(
          (c) =>
            LINE_TAGS.test(c.tagName) || c.matches('.checklist, .checklist-item, table, ul, ol')
        );
        if (LINE_TAGS.test(child.tagName) && !hasBlocks) {
          if (child.textContent.trim()) push(child.textContent, child.tagName.toLowerCase());
          return;
        }
        walk(child);
      });
    };
    walk(body);
    return lines.filter((line) => line.text);
  }

  // Inside a changed line: the words removed and added, the rest as it was (words next to each
  // other that changed the same way are one piece)
  wordDiffHtml(before, after) {
    const words = (text) => text.split(/\s+/).filter(Boolean);
    const parts = [];
    diffSequences(words(before), words(after), (x, y) => x === y).forEach((step) => {
      const text = step.type === 'added' ? step.b : step.a;
      const last = parts[parts.length - 1];
      if (last && last.type === step.type) last.words.push(text);
      else parts.push({ type: step.type, words: [text] });
    });
    return parts
      .map(({ type, words: list }) => {
        const text = this.escapeHtml(list.join(' '));
        if (type === 'same') return text;
        return type === 'removed'
          ? `<del class="diff-del">${text}</del>`
          : `<ins class="diff-ins">${text}</ins>`;
      })
      .join(' ');
  }

  // How alike two lines are, by their words (0 to 1)
  lineLikeness(a, b) {
    const wa = a.toLowerCase().split(/\s+/).filter(Boolean);
    const wb = b.toLowerCase().split(/\s+/).filter(Boolean);
    if (!wa.length || !wb.length) return 0;
    const rest = [...wb];
    let common = 0;
    wa.forEach((w) => {
      const at = rest.indexOf(w);
      if (at >= 0) {
        common++;
        rest.splice(at, 1);
      }
    });
    return (2 * common) / (wa.length + wb.length);
  }

  // A stretch of removed and added lines: an added line alike enough to a removed one (in order)
  // is that line changed, shown word by word; the others were removed or added
  hunkRows(removed, added) {
    const rows = [];
    let next = 0; // the first removed line not yet shown
    added.forEach((line) => {
      let match = -1;
      for (let i = next; i < removed.length; i++) {
        if (this.lineLikeness(removed[i].text, line.text) >= 0.3) {
          match = i;
          break;
        }
      }
      if (match < 0) {
        rows.push({ type: 'added', kind: line.kind, html: this.escapeHtml(line.text) });
        return;
      }
      for (; next < match; next++) {
        const gone = removed[next];
        rows.push({ type: 'removed', kind: gone.kind, html: this.escapeHtml(gone.text) });
      }
      rows.push({
        type: 'changed',
        kind: line.kind,
        html: this.wordDiffHtml(removed[match].text, line.text),
      });
      next = match + 1;
    });
    for (; next < removed.length; next++) {
      const gone = removed[next];
      rows.push({ type: 'removed', kind: gone.kind, html: this.escapeHtml(gone.text) });
    }
    return rows;
  }

  // The comparison of a version with the note now: rows, and how many lines were added and removed
  versionDiff(versionHtml, currentHtml) {
    const steps = diffSequences(
      this.noteLines(versionHtml),
      this.noteLines(currentHtml),
      (x, y) => x.text === y.text
    );
    // Unchanged lines as they are; each stretch of changes paired up line by line
    const rows = [];
    let removed = [];
    let added = [];
    const flush = () => {
      if (removed.length || added.length) rows.push(...this.hunkRows(removed, added));
      removed = [];
      added = [];
    };
    steps.forEach((step) => {
      if (step.type === 'removed') removed.push(step.a);
      else if (step.type === 'added') added.push(step.b);
      else {
        flush();
        rows.push({ type: 'same', kind: step.b.kind, html: this.escapeHtml(step.b.text) });
      }
    });
    flush();
    return {
      rows,
      added: rows.filter((r) => r.type === 'added' || r.type === 'changed').length,
      removed: rows.filter((r) => r.type === 'removed' || r.type === 'changed').length,
    };
  }

  // The comparison drawn: the title if it changed, the lines, long unchanged runs folded
  renderVersionDiff(version, note) {
    const box = document.createElement('div');
    box.className = 'version-diff';
    const { rows, added, removed } = this.versionDiff(version.content, note.content);
    if ((version.title || '') !== (note.title || '')) {
      const title = document.createElement('div');
      title.className = 'diff-row is-changed diff-title';
      title.innerHTML = this.wordDiffHtml(version.title || '', note.title || '');
      box.appendChild(title);
    }
    if (!rows.some((r) => r.type !== 'same')) {
      const none = document.createElement('p');
      none.className = 'diff-none';
      none.textContent = i18n.t('history.noChanges');
      box.appendChild(none);
    }
    const near = rows.map((_, i) =>
      rows.slice(Math.max(0, i - FOLD_AFTER), i + FOLD_AFTER + 1).some((r) => r.type !== 'same')
    );
    let fold = null;
    rows.forEach((row, i) => {
      const el = document.createElement('div');
      el.className = `diff-row is-${row.type} kind-${row.kind}`;
      el.innerHTML = row.html;
      if (row.type === 'same' && !near[i]) {
        if (!fold) {
          fold = document.createElement('button');
          fold.type = 'button';
          fold.className = 'diff-fold';
          fold.hiddenRows = [];
          box.appendChild(fold);
          const holder = fold;
          fold.addEventListener('click', () => {
            holder.hiddenRows.forEach((r) => r.classList.remove('hidden'));
            holder.remove();
          });
        }
        el.classList.add('hidden');
        fold.hiddenRows.push(el);
        fold.textContent = i18n.t('history.unchangedLines', { count: fold.hiddenRows.length });
      } else {
        fold = null;
      }
      box.appendChild(el);
    });
    return { element: box, added, removed };
  }

  // The version on screen shown as a comparison with the note now, or as it was
  toggleVersionDiff(on = !this.versionPreview?.diff) {
    const preview = this.versionPreview;
    if (!preview) return;
    preview.diff = on;
    this.versionDiffBtn?.classList.toggle('active', on);
    this.versionDiffBtn?.setAttribute('aria-pressed', String(on));
    this.versionDiffSummary?.classList.toggle('hidden', !on);
    if (!on) {
      this.previewNoteVersion(preview.note, preview.version, preview.savedAt);
      return;
    }
    const { element, added, removed } = this.renderVersionDiff(preview.version, preview.note);
    this.viewerText.replaceChildren(element);
    if (this.versionDiffSummary) {
      this.versionDiffSummary.textContent = i18n.t('history.diffSummary', { added, removed });
    }
  }
}
