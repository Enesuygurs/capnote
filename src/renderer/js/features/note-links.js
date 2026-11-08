// Links between notes. Typing "[[" in the editor suggests notes to link to ("[[Title]]" typed in
// full links too). In the editor a link is one piece: its text cannot be edited, Backspace or Delete
// next to it removes it whole. In the viewer a link opens its note and always shows the note's
// current title, and a note lists the notes that link to it.

import { i18n } from '../i18n.js';

const MAX_SUGGESTIONS = 8;

export class NoteLinksFeature {
  noteLinkElement(note) {
    const link = document.createElement('a');
    link.className = 'note-link';
    link.dataset.noteId = note.id;
    link.href = '#';
    link.contentEditable = 'false';
    link.textContent = this.displayTitle(note);
    return link;
  }

  // Every link in the editor as one piece: not editable, only its title inside (no link in a link,
  // no half-deleted title from older versions), and no empty links
  prepareNoteLinks(root = this.richEditor) {
    if (!root) return;
    // Outer ones first: a link inside another is dropped with the outer one's text
    root.querySelectorAll('a.note-link').forEach((link) => {
      if (!link.isConnected) return;
      const note = this.notes.find((n) => String(n.id) === link.dataset.noteId);
      const text = note ? this.displayTitle(note) : link.textContent.trim();
      if (!text) {
        link.remove();
        return;
      }
      if (link.textContent !== text || link.children.length) link.textContent = text;
      if (link.getAttribute('contenteditable') !== 'false') link.contentEditable = 'false';
    });
  }

  // The note link right before (or after) a collapsed caret, if there is one: inside the same line,
  // past empty text and into the end (or start) of inline elements such as bold text
  noteLinkNextToCaret(range, backwards) {
    if (!range || !range.collapsed) return null;
    let node = range.startContainer;
    let offset = range.startOffset;
    const editor = this.richEditor;
    const isEmptyText = (n) => n.nodeType === Node.TEXT_NODE && !n.data.replace(/\u200b/g, '');
    const isBlock = (n) =>
      n.nodeType === Node.ELEMENT_NODE &&
      /^(P|DIV|LI|UL|OL|H[1-6]|PRE|BLOCKQUOTE|TABLE|TR|TD|TH|BR|HR|IMG|DETAILS|SUMMARY)$/.test(
        n.tagName
      );
    // The caret inside a link's text (Home can put it there): at its start it is before the link,
    // anywhere else after it
    const inside = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node)?.closest(
      'a.note-link'
    );
    if (inside && editor.contains(inside)) {
      const atStart = offset === 0;
      if (backwards ? !atStart : atStart) return inside;
      const index = [...inside.parentNode.childNodes].indexOf(inside);
      node = inside.parentNode;
      offset = backwards ? index : index + 1;
    }
    let candidate = null;
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.data;
      const rest = backwards ? text.slice(0, offset) : text.slice(offset);
      if (rest.replace(/\u200b/g, '')) return null;
      candidate = backwards ? node.previousSibling : node.nextSibling;
      // At the edge of an inline element: step out of it
      let parent = node.parentNode;
      while (!candidate && parent && parent !== editor && !isBlock(parent)) {
        if (parent.matches?.('a.note-link')) return parent;
        candidate = backwards ? parent.previousSibling : parent.nextSibling;
        parent = parent.parentNode;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      candidate = backwards ? node.childNodes[offset - 1] : node.childNodes[offset];
    }
    while (candidate) {
      if (isEmptyText(candidate)) {
        candidate = backwards ? candidate.previousSibling : candidate.nextSibling;
        continue;
      }
      if (candidate.nodeType !== Node.ELEMENT_NODE) return null;
      if (candidate.matches('a.note-link')) return editor.contains(candidate) ? candidate : null;
      if (isBlock(candidate)) return null;
      // An inline element (bold, a span): look at its last (or first) piece
      candidate = backwards ? candidate.lastChild : candidate.firstChild;
    }
    return null;
  }

  // Where the caret is when the browser has put it inside a link's text (Home or a click can):
  // before the link at its start, else after it. Null when it is not in a link.
  caretBesideNoteLink() {
    const sel = window.getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return null;
    const node = sel.anchorNode;
    const el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    const link = el?.closest?.('a.note-link');
    if (!link || !this.richEditor.contains(link)) return null;
    return { link, before: sel.anchorOffset === 0 };
  }

  // Typing there goes next to the link, never into it (where the browser types nothing; it does
  // not even send an input event). Enter there makes a new line before or after the link.
  typeBesideNoteLink(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const printable = e.key.length === 1;
    if (!printable && e.key !== 'Enter') return;
    const spot = this.caretBesideNoteLink();
    if (!spot) return;
    const { link, before } = spot;
    const parent = link.parentNode;
    const sibling = before ? link.previousSibling : link.nextSibling;
    let node = sibling?.nodeType === Node.TEXT_NODE ? sibling : null;
    if (printable) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!node) {
        node = document.createTextNode('');
        parent.insertBefore(node, before ? link : link.nextSibling);
      }
      const at = before ? node.length : 0;
      node.insertData(at, e.key);
      this.placeCaret(node, at + 1);
      this.trackContentChanges();
      this.updateNoteLinkSuggestions();
      return;
    }
    // Enter at the start of the line: an empty line above it, the caret stays before the link
    const block = link.closest('p, li, h1, h2, h3, h4, h5, h6, div, blockquote');
    if (before && block && block !== this.richEditor && this.richEditor.contains(block)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const line = block.cloneNode(false);
      line.removeAttribute('id');
      line.innerHTML = '<br>';
      block.before(line);
      const holder = document.createTextNode('');
      parent.insertBefore(holder, link);
      this.placeCaret(holder, 0);
      this.trackContentChanges();
      return;
    }
    // Else the line breaks from beside the link, as the browser does it
    if (!node) {
      node = document.createTextNode(before ? '' : '\u00a0');
      parent.insertBefore(node, before ? link : link.nextSibling);
    }
    this.placeCaret(node, before ? node.length : 0);
  }

  // Backspace right after a link (or Delete right before one) removes the whole link
  removeNoteLinkAtCaret(e) {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const range = this.caretRange();
    const link = this.noteLinkNextToCaret(range, e.key === 'Backspace');
    if (!link) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    // The caret stays where the link was
    const parent = link.parentNode;
    const marker = document.createTextNode('');
    parent.insertBefore(marker, link);
    link.remove();
    this.placeCaret(marker, 0);
    this.hideNoteLinkMenu();
    this.trackContentChanges();
  }

  // "[[query" right before the caret, in the text node the caret is in
  linkQueryAtCaret() {
    const range = this.caretRange();
    if (!range || !range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE) return null;
    if (range.startContainer.parentElement.closest('pre, a')) return null;
    const node = range.startContainer;
    const before = node.data.slice(0, range.startOffset);
    const match = before.match(/\[\[([^[\]\n]{0,60})$/);
    if (!match) return null;
    return {
      node,
      start: before.length - match[0].length,
      end: range.startOffset,
      query: match[1],
    };
  }

  noteLinkCandidates(query) {
    const term = this.normalizeForSearch(query);
    const current = this.currentNote;
    return this.notes
      .filter((n) => n !== current && n.id !== current?.id)
      .map((n) => ({ note: n, title: this.normalizeForSearch(this.displayTitle(n)) }))
      .filter(({ title }) => !term || title.includes(term))
      .sort((x, y) => Number(y.title.startsWith(term)) - Number(x.title.startsWith(term)))
      .slice(0, MAX_SUGGESTIONS)
      .map(({ note }) => note);
  }

  // Show (or hide) the suggestions for the "[[" being typed
  updateNoteLinkSuggestions() {
    const query = this.linkQueryAtCaret();
    if (!query) return this.hideNoteLinkMenu();
    this.noteLinkQuery = query;
    const notes = this.noteLinkCandidates(query.query);
    const menu = this.noteLinkMenu;
    menu.innerHTML = '';
    if (!notes.length) {
      const empty = document.createElement('div');
      empty.className = 'menu-empty';
      empty.textContent = i18n.t('noteLinks.noMatch');
      menu.appendChild(empty);
    }
    notes.forEach((note, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'menu-item';
      item.classList.toggle('active', index === 0);
      item.innerHTML = `<i class="fas fa-file-lines"></i><span></span>`;
      item.querySelector('span').textContent = this.displayTitle(note);
      // Keep the caret in the note while choosing
      item.addEventListener('mousedown', (e) => e.preventDefault());
      item.addEventListener('click', () => this.chooseNoteLink(note));
      menu.appendChild(item);
    });
    this.noteLinkChoices = notes;
    this.noteLinkIndex = 0;

    const caret = document.createRange();
    caret.setStart(query.node, query.end);
    const rect = caret.getClientRects()[0] || query.node.parentElement.getBoundingClientRect();
    this.positionMenu(menu, rect.left, rect.bottom + 4);
  }

  hideNoteLinkMenu() {
    this.noteLinkMenu?.classList.add('hidden');
    this.noteLinkChoices = null;
  }

  // Replace "[[query" with a link to the note and continue after it
  chooseNoteLink(note) {
    const query = this.noteLinkQuery;
    this.hideNoteLinkMenu();
    if (!query || !query.node.isConnected) return;
    const range = document.createRange();
    range.setStart(query.node, query.start);
    range.setEnd(query.node, Math.min(query.end, query.node.length));
    range.deleteContents();
    const link = this.noteLinkElement(note);
    const space = document.createTextNode('\u00a0');
    range.insertNode(space);
    range.insertNode(link);
    this.placeCaret(space, 1);
    this.trackContentChanges();
  }

  // "[[Title]]" typed in full becomes a link when a note has that title
  linkTypedNoteTitle() {
    const range = this.caretRange();
    if (!range || !range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE) return;
    const node = range.startContainer;
    const before = node.data.slice(0, range.startOffset);
    const match = before.match(/\[\[([^[\]\n]+)\]\]$/);
    if (!match) return;
    const wanted = this.normalizeForSearch(match[1]);
    const note = this.notes.find((n) => this.normalizeForSearch(this.displayTitle(n)) === wanted);
    if (!note) return;
    this.noteLinkQuery = {
      node,
      start: before.length - match[0].length,
      end: range.startOffset,
      query: match[1],
    };
    this.chooseNoteLink(note);
  }

  handleNoteLinkKeys(e) {
    if (!this.noteLinkChoices || this.noteLinkMenu.classList.contains('hidden')) return;
    const items = [...this.noteLinkMenu.querySelectorAll('.menu-item')];
    const move = (step) => {
      if (!items.length) return;
      this.noteLinkIndex = (this.noteLinkIndex + step + items.length) % items.length;
      items.forEach((item, i) => item.classList.toggle('active', i === this.noteLinkIndex));
    };
    const stop = () => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    if (e.key === 'ArrowDown') {
      stop();
      move(1);
    } else if (e.key === 'ArrowUp') {
      stop();
      move(-1);
    } else if ((e.key === 'Enter' || e.key === 'Tab') && this.noteLinkChoices.length) {
      stop();
      this.chooseNoteLink(this.noteLinkChoices[this.noteLinkIndex]);
    } else if (e.key === 'Escape') {
      stop();
      this.hideNoteLinkMenu();
    }
  }

  // ============ Viewer ============
  // Links show their note's current title; a link to a deleted note is shown as broken
  refreshNoteLinks(container) {
    container.querySelectorAll('a.note-link').forEach((link) => {
      const note = this.notes.find((n) => n.id === link.dataset.noteId);
      link.classList.toggle('is-broken', !note);
      link.title = note ? '' : i18n.t('noteLinks.missing');
      if (note) link.textContent = this.displayTitle(note);
    });
  }

  // The notes whose text links to this one (locked notes cannot be read, so they are not listed)
  backlinksOf(note) {
    const marker = `data-note-id="${note.id}"`;
    return this.notes.filter(
      (n) => n.id !== note.id && !this.isNoteLockedForView(n) && (n.content || '').includes(marker)
    );
  }

  renderBacklinks(note) {
    const box = this.viewerBacklinks;
    if (!box) return;
    const sources = note && !this.isNoteLockedForView(note) ? this.backlinksOf(note) : [];
    box.classList.toggle('hidden', !sources.length);
    const list = box.querySelector('.backlinks-list');
    list.innerHTML = '';
    sources.forEach((source) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip backlink';
      chip.innerHTML = '<i class="fas fa-file-lines"></i><span></span>';
      chip.querySelector('span').textContent = this.displayTitle(source);
      chip.addEventListener('click', () => this.selectNote(source));
      list.appendChild(chip);
    });
  }

  openLinkedNote(link) {
    const note = this.notes.find((n) => n.id === link.dataset.noteId);
    if (note) this.selectNote(note);
    else this.showNotification(i18n.t('noteLinks.missing'), 'warning');
  }

  setupNoteLinks() {
    this.richEditor.addEventListener('input', (e) => {
      if (e.inputType === 'insertText' && e.data === ']') this.linkTypedNoteTitle();
      // A pasted or dropped link is made one piece too
      if (
        this.richEditor.querySelector('a.note-link:not([contenteditable="false"]), a.note-link a')
      )
        this.prepareNoteLinks();
      this.updateNoteLinkSuggestions();
    });
    this.richEditor.addEventListener('keydown', (e) => this.handleNoteLinkKeys(e), true);
    this.richEditor.addEventListener('keydown', (e) => this.removeNoteLinkAtCaret(e), true);
    this.richEditor.addEventListener('keydown', (e) => this.typeBesideNoteLink(e), true);
    this.richEditor.addEventListener('blur', () => setTimeout(() => this.hideNoteLinkMenu(), 150));
    // In the editor Ctrl/Cmd+click follows a note link; in the viewer a click does
    this.richEditor.addEventListener('click', (e) => {
      const link = e.target.closest('a.note-link');
      if (link && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.openLinkedNote(link);
      }
    });
    this.viewerText.addEventListener('click', (e) => {
      const link = e.target.closest('a.note-link');
      if (!link) return;
      e.preventDefault();
      this.openLinkedNote(link);
    });
  }
}
