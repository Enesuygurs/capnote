// Find and replace in the open note, as a code editor does. Ctrl+F finds in the note (in the viewer
// or the editor), Ctrl+H also replaces (a note being read opens for editing). The bar sits at the
// top right of the note: the search, a match case toggle, "3/12", previous, next and close; under
// it, when replacing, the replacement with Replace and Replace all.
//
// Matches are marked with the CSS Custom Highlight API, so the note's HTML never changes for it;
// the current match has its own color and is scrolled into view. In a plain text note (a file
// note, Markdown) the current match is the text area's selection. Enter / Shift+Enter (and F3 /
// Shift+F3) go to the next / previous match, Escape closes. A replacement is one undo step.
// The bar follows the note: another note, or the same note in the editor, is searched again.

import { i18n } from '../i18n.js';

const MAX_MATCHES = 5000;
const RESEARCH_DELAY_MS = 120;

// Every character in lower case, one for one, so positions in the folded text are positions in the
// text (a Turkish dotted capital I lowers to two characters without its locale). The four Turkish
// i's (i, ı, I, İ) are one letter: "istanbul" finds ISTANBUL and İstanbul alike.
function foldText(text, lang) {
  let out = '';
  for (const ch of text) {
    let low = ch.toLocaleLowerCase(lang);
    if (low.length !== ch.length) low = ch.toLowerCase();
    if (low.length !== ch.length) low = ch;
    out += low === 'ı' ? 'i' : low;
  }
  return out;
}

// The nearest element around a node that scrolls
function scrollParentOf(el) {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

export class FindReplaceFeature {
  setupFindReplace() {
    const bar = document.createElement('div');
    bar.className = 'find-bar hidden';
    bar.setAttribute('role', 'search');
    bar.innerHTML = `
      <button type="button" class="find-btn find-toggle" data-find="toggle">
        <i class="fas fa-chevron-right"></i>
      </button>
      <div class="find-rows">
        <div class="find-row">
          <input type="text" class="find-input" data-find="query" spellcheck="false" />
          <button type="button" class="find-btn find-case" data-find="case">Aa</button>
          <span class="find-count" aria-live="polite"></span>
          <button type="button" class="find-btn" data-find="prev">
            <i class="fas fa-arrow-up"></i>
          </button>
          <button type="button" class="find-btn" data-find="next">
            <i class="fas fa-arrow-down"></i>
          </button>
          <button type="button" class="find-btn" data-find="close">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="find-row find-replace-row hidden">
          <input type="text" class="find-input" data-find="replacement" spellcheck="false" />
          <button type="button" class="find-text-btn" data-find="replace"></button>
          <button type="button" class="find-text-btn" data-find="replaceAll"></button>
        </div>
      </div>`;
    document.body.appendChild(bar);
    const part = (name) => bar.querySelector(`[data-find="${name}"]`);
    this.find = {
      bar,
      query: part('query'),
      replacement: part('replacement'),
      replaceRow: bar.querySelector('.find-replace-row'),
      toggle: part('toggle'),
      caseBtn: part('case'),
      count: bar.querySelector('.find-count'),
      matchCase: false,
      matches: [],
      index: -1,
      target: null,
      timer: null,
    };
    this.translateFindBar();

    bar.addEventListener('mousedown', (e) => {
      // The buttons keep the caret where it is (in the search field)
      if (e.target.closest('button')) e.preventDefault();
    });
    bar.addEventListener('click', (e) => {
      const action = e.target.closest('button')?.dataset.find;
      if (action === 'toggle') this.setFindReplace(!this.isFindReplaceShown());
      else if (action === 'case') {
        this.find.matchCase = !this.find.matchCase;
        this.find.caseBtn.classList.toggle('active', this.find.matchCase);
        this.runFind();
      } else if (action === 'prev') this.findStep(-1);
      else if (action === 'next') this.findStep(1);
      else if (action === 'close') this.closeFind();
      else if (action === 'replace') this.replaceCurrentMatch();
      else if (action === 'replaceAll') this.replaceAllMatches();
    });
    this.find.query.addEventListener('input', () => this.runFind({ keepNear: true }));
    this.find.query.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.findStep(e.shiftKey ? -1 : 1);
      }
    });
    this.find.replacement.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if ((e.ctrlKey || e.metaKey) && e.altKey) this.replaceAllMatches();
      else this.replaceCurrentMatch();
    });
    bar.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.closeFind();
      }
    });
    // F3 / Shift+F3 anywhere while the bar is open
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'F3' || !this.isFindOpen()) return;
      e.preventDefault();
      this.findStep(e.shiftKey ? -1 : 1);
    });
    // The note being edited changes: its matches are found again
    this.richEditor?.addEventListener('input', () => this.scheduleFind());
    this.markdownEditor?.addEventListener('input', () => this.scheduleFind());
    window.addEventListener('resize', () => this.placeFindBar());
  }

  translateFindBar() {
    const f = this.find;
    if (!f) return;
    f.query.placeholder = i18n.t('find.placeholder');
    f.replacement.placeholder = i18n.t('find.replacePlaceholder');
    const titles = {
      toggle: 'find.toggleReplace',
      case: 'find.matchCase',
      prev: 'find.previous',
      next: 'find.next',
      close: 'find.close',
    };
    Object.entries(titles).forEach(([name, key]) => {
      const btn = f.bar.querySelector(`[data-find="${name}"]`);
      btn.title = i18n.t(key);
      btn.setAttribute('aria-label', i18n.t(key));
    });
    f.bar.querySelector('[data-find="replace"]').textContent = i18n.t('find.replace');
    f.bar.querySelector('[data-find="replaceAll"]').textContent = i18n.t('find.replaceAll');
    if (this.isFindOpen()) this.showFindCount();
  }

  isFindOpen() {
    return !!this.find && !this.find.bar.classList.contains('hidden');
  }

  isFindReplaceShown() {
    return !!this.find && !this.find.replaceRow.classList.contains('hidden');
  }

  setFindReplace(shown) {
    const f = this.find;
    f.replaceRow.classList.toggle('hidden', !shown);
    f.bar.classList.toggle('is-replacing', shown);
    f.toggle.querySelector('i').className = `fas fa-chevron-${shown ? 'down' : 'right'}`;
    // Replacing needs the note open for editing
    if (shown && f.target?.readOnly) this.editForReplace();
    this.placeFindBar();
  }

  // Where to search: the editor's text (rich or plain) while editing, the note's text while reading
  findTarget() {
    if (this.isEditorOpen?.()) {
      if (this.isMarkdownEditing?.() && !this.markdownEditor.classList.contains('hidden')) {
        return { kind: 'plain', el: this.markdownEditor, readOnly: false };
      }
      if (this.richEditor && !this.richEditor.classList.contains('hidden')) {
        return { kind: 'rich', el: this.richEditor, readOnly: false };
      }
      return null;
    }
    if (this.isViewerOpen?.() && this.currentNote && this.viewerText) {
      return { kind: 'rich', el: this.viewerText, readOnly: true };
    }
    return null;
  }

  // Ctrl+F (find) and Ctrl+H (find and replace) in the open note
  openFind({ replace = false } = {}) {
    if (replace && this.isViewerOpen?.() && !this.editForReplace()) replace = false;
    const target = this.findTarget();
    if (!target) return false;
    const f = this.find;
    f.target = target;
    // The selected text (one short line) is what to find
    const picked =
      target.kind === 'plain'
        ? target.el.value.slice(target.el.selectionStart, target.el.selectionEnd)
        : String(window.getSelection() || '');
    if (picked && !picked.includes('\n') && picked.length <= 200) f.query.value = picked;
    f.bar.classList.remove('hidden');
    this.setFindReplace(replace);
    this.placeFindBar();
    f.query.focus();
    f.query.select();
    this.runFind();
    return true;
  }

  // A note being read opens for editing, to replace in it (not a locked one)
  editForReplace() {
    if (!this.currentNote || this.isNoteLockedForView?.(this.currentNote)) return false;
    if (!this.isEditorOpen?.()) this.editCurrentNote();
    this.find.target = this.findTarget();
    return !!this.find.target && !this.find.target.readOnly;
  }

  closeFind() {
    const f = this.find;
    if (!f || !this.isFindOpen()) return;
    f.bar.classList.add('hidden');
    clearTimeout(f.timer);
    this.clearFindMarks();
    f.matches = [];
    f.index = -1;
    // Back to writing where the current match was
    if (f.target && !f.target.readOnly && document.activeElement?.closest('.find-bar')) {
      f.target.el.focus();
    }
    f.target = null;
  }

  // The note on screen changed (another note, the editor, the viewer, another screen): the open
  // bar searches it again, or closes when there is no note
  refreshFind() {
    if (!this.isFindOpen()) return;
    requestAnimationFrame(() => {
      const target = this.findTarget();
      if (!target) {
        this.closeFind();
        return;
      }
      this.find.target = target;
      if (target.readOnly && this.isFindReplaceShown()) this.setFindReplace(false);
      this.placeFindBar();
      this.runFind();
    });
  }

  scheduleFind() {
    if (!this.isFindOpen()) return;
    clearTimeout(this.find.timer);
    this.find.timer = setTimeout(
      () => this.runFind({ keepNear: true, scroll: false }),
      RESEARCH_DELAY_MS
    );
  }

  // The bar at the top right of the note's text, inside its scrolling area
  placeFindBar() {
    const f = this.find;
    if (!this.isFindOpen() || !f.target) return;
    // Always the same place: right under the note's header (the editor's toolbar), at the right of
    // the note, over the text (which does not move for it)
    const screen = f.target.el.closest('.note-editor, .note-viewer') || f.target.el;
    const bars = [...screen.querySelectorAll('.page-header, .formatting-toolbar')].filter(
      (el) => el.offsetParent !== null
    );
    const box = screen.getBoundingClientRect();
    const top = bars.length
      ? Math.max(...bars.map((el) => el.getBoundingClientRect().bottom))
      : box.top;
    f.bar.style.top = `${Math.round(top + 8)}px`;
    // At the right of the note's text (left of the editor's side panel, the scrollbar and the map)
    const host = scrollParentOf(f.target.el) || f.target.el;
    const text = host.getBoundingClientRect();
    const scrollbar = host.offsetWidth - host.clientWidth;
    const map = this.minimapWidth?.() || 0;
    const right = Math.min(text.right - scrollbar - map, box.right) - 16;
    f.bar.style.right = `${Math.round(window.innerWidth - right)}px`;
  }

  // The text pieces of a rich text, with where each starts in the whole text
  findTextNodes(root) {
    const nodes = [];
    let text = '';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.parentElement?.closest('button, [aria-hidden="true"], .find-bar')
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      nodes.push({ node, start: text.length });
      text += node.data;
    }
    return { nodes, text };
  }

  // Where every match of the search is, from the start of the text
  findOffsets(text, query) {
    const lang = i18n.getLanguage?.() === 'en' ? 'en' : 'tr';
    const hay = this.find.matchCase ? text : foldText(text, lang);
    const needle = this.find.matchCase ? query : foldText(query, lang);
    const found = [];
    for (let at = hay.indexOf(needle); at !== -1 && found.length < MAX_MATCHES;) {
      found.push([at, at + needle.length]);
      at = hay.indexOf(needle, at + needle.length);
    }
    return found;
  }

  runFind({ keepNear = false, scroll = true } = {}) {
    const f = this.find;
    if (!f?.target) return;
    const query = f.query.value;
    const previous = f.matches[f.index];
    f.matches = [];
    f.index = -1;
    if (query) {
      if (f.target.kind === 'plain') {
        f.matches = this.findOffsets(f.target.el.value, query).map(([start, end]) => ({
          start,
          end,
        }));
      } else {
        const { nodes, text } = this.findTextNodes(f.target.el);
        const at = (offset, isEnd) => {
          // The text piece that holds this position (an end at a piece's end stays in it)
          let lo = 0;
          let hi = nodes.length - 1;
          while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            const start = nodes[mid].start;
            if (start < offset || (!isEnd && start === offset)) lo = mid;
            else hi = mid - 1;
          }
          return [nodes[lo].node, offset - nodes[lo].start];
        };
        f.matches = this.findOffsets(text, query).map(([start, end]) => {
          const range = document.createRange();
          range.setStart(...at(start, false));
          range.setEnd(...at(end, true));
          return range;
        });
      }
    }
    if (f.matches.length) {
      // While typing, the current match stays where it was (or the next one after it)
      const from = keepNear && previous ? this.matchStart(previous) : 0;
      const next = f.matches.findIndex((m) => this.matchStart(m) >= from);
      f.index = next === -1 ? 0 : next;
    }
    this.showFindMatches(scroll);
  }

  matchStart(match) {
    if (typeof match.start === 'number') return match.start;
    const range = document.createRange();
    range.setStart(this.find.target.el, 0);
    try {
      range.setEnd(match.startContainer, match.startOffset);
    } catch {
      return 0;
    }
    return range.toString().length;
  }

  findStep(step) {
    const f = this.find;
    if (!f.matches.length) return;
    f.index = (f.index + step + f.matches.length) % f.matches.length;
    this.showFindMatches(true);
  }

  clearFindMarks() {
    if (globalThis.CSS?.highlights) {
      CSS.highlights.delete('find-match');
      CSS.highlights.delete('find-current');
    }
  }

  showFindCount() {
    const f = this.find;
    const none = !!f.query.value && !f.matches.length;
    f.count.textContent = f.query.value
      ? none
        ? i18n.t('find.noResults')
        : i18n.t('find.count', { current: f.index + 1, total: f.matches.length })
      : '';
    f.bar.classList.toggle('no-results', none);
    const replaceable = !!f.matches.length && !!f.target && !f.target.readOnly;
    f.bar.querySelectorAll('.find-text-btn').forEach((btn) => (btn.disabled = !replaceable));
  }

  showFindMatches(scroll) {
    const f = this.find;
    this.clearFindMarks();
    this.showFindCount();
    if (!f.matches.length) return;
    const current = f.matches[f.index];
    if (f.target.kind === 'plain') {
      const ta = f.target.el;
      ta.setSelectionRange(current.start, current.end);
      if (scroll) {
        const line = ta.value.slice(0, current.start).split('\n').length - 1;
        const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 20;
        const host = scrollParentOf(ta) || ta;
        host.scrollTop = Math.max(0, line * lineHeight - host.clientHeight / 3);
      }
      return;
    }
    if (globalThis.CSS?.highlights && typeof Highlight === 'function') {
      CSS.highlights.set('find-match', new Highlight(...f.matches.filter((m) => m !== current)));
      CSS.highlights.set('find-current', new Highlight(current));
    }
    if (scroll) this.scrollMatchIntoView(current);
  }

  scrollMatchIntoView(range) {
    const rect = range.getBoundingClientRect();
    const host = scrollParentOf(range.startContainer.parentElement);
    if (!host || (!rect.width && !rect.height)) return;
    const box = host.getBoundingClientRect();
    // Clear of the bar at the top and of the bottom edge
    if (rect.top < box.top + 64 || rect.bottom > box.bottom - 24) {
      host.scrollTop += rect.top - box.top - box.height / 3;
    }
  }

  // Replace the current match (and go on to the next)
  replaceCurrentMatch() {
    const f = this.find;
    if (!f.matches.length || !f.target || f.target.readOnly) return;
    const text = f.replacement.value;
    const match = f.matches[f.index];
    if (f.target.kind === 'plain') {
      f.target.el.setRangeText(text, match.start, match.end, 'end');
      f.target.el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // The note as it was is the step Ctrl+Z goes back to
      this.recordEditorHistory?.('step');
      match.deleteContents();
      if (text) match.insertNode(document.createTextNode(text));
      f.target.el.normalize();
      this.trackContentChanges();
    }
    const at = this.matchStart(match) + text.length;
    this.runFind({ scroll: false });
    if (f.matches.length) {
      const next = f.matches.findIndex((m) => this.matchStart(m) >= at);
      f.index = next === -1 ? 0 : next;
      this.showFindMatches(true);
    }
  }

  // Replace every match, as one step
  replaceAllMatches() {
    const f = this.find;
    if (!f.matches.length || !f.target || f.target.readOnly) return;
    const text = f.replacement.value;
    const count = f.matches.length;
    if (f.target.kind === 'plain') {
      const ta = f.target.el;
      let value = ta.value;
      [...f.matches].reverse().forEach((m) => {
        value = value.slice(0, m.start) + text + value.slice(m.end);
      });
      ta.value = value;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      this.recordEditorHistory?.('step');
      [...f.matches].reverse().forEach((range) => {
        range.deleteContents();
        if (text) range.insertNode(document.createTextNode(text));
      });
      f.target.el.normalize();
      this.trackContentChanges();
    }
    this.runFind({ scroll: false });
    this.showNotification?.(i18n.t('find.replaced', { count }), 'success');
  }
}
