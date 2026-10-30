// Links between notes. Typing "[[" in the editor suggests notes to link to ("[[Title]]" typed in
// full links too). In the viewer a link opens its note and always shows the note's current title,
// and a note lists the notes that link to it.

import { i18n } from '../i18n.js';

const MAX_SUGGESTIONS = 8;

export class NoteLinksFeature {
  noteLinkElement(note) {
    const link = document.createElement('a');
    link.className = 'note-link';
    link.dataset.noteId = note.id;
    link.href = '#';
    link.textContent = this.displayTitle(note);
    return link;
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
      this.updateNoteLinkSuggestions();
    });
    this.richEditor.addEventListener('keydown', (e) => this.handleNoteLinkKeys(e), true);
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
