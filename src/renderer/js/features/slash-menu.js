// The "/" menu: "/" typed at the start of a line lists what can go there (a heading, a list, a
// task list, a table, code, a note link…); typing on narrows the list, the arrows move in it,
// Enter or a click puts the choice in place of "/…". Escape, a space or leaving the line closes
// it and the "/" stays as typed.

import { i18n } from '../i18n.js';

const MAX_QUERY = 24;
// The line a "/" must start: a list item, a task's text, a heading, a paragraph, a quote, a cell
const LINE = 'li, .checklist-item > label, h1, h2, h3, h4, h5, h6, p, blockquote, td, th';

export class SlashMenuFeature {
  // name, icon, the label's translation key, other words it is found by, what it does
  slashCommands() {
    return [
      [
        'text',
        'fa-paragraph',
        'blockStyle.p',
        'paragraph text normal',
        () => this.applyBlockStyle('p'),
      ],
      ['h1', 'fa-heading', 'blockStyle.h1', 'h1 heading title', () => this.applyBlockStyle('h1')],
      ['h2', 'fa-heading', 'blockStyle.h2', 'h2 heading', () => this.applyBlockStyle('h2')],
      ['h3', 'fa-heading', 'blockStyle.h3', 'h3 heading', () => this.applyBlockStyle('h3')],
      [
        'task',
        'fa-list-check',
        'slashMenu.task',
        'todo task checkbox',
        () => this.insertChecklist(),
      ],
      ['bullets', 'fa-list-ul', 'slashMenu.bullets', 'bullet list ul', () => this.insertList('ul')],
      [
        'numbers',
        'fa-list-ol',
        'slashMenu.numbers',
        'numbered list ol',
        () => this.insertList('ol'),
      ],
      ['quote', 'fa-quote-right', 'toolbar.quote', 'quote', () => this.toggleQuote()],
      ['divider', 'fa-minus', 'toolbar.divider', 'divider line hr', () => this.insertDivider()],
      ['table', 'fa-table', 'toolbar.table', 'table grid', () => this.showModal(this.tableModal)],
      ['code', 'fa-laptop-code', 'toolbar.codeBlock', 'code pre', () => this.insertCodeBlock()],
      ['link', 'fa-file-lines', 'slashMenu.noteLink', 'note link wiki', () => this.startNoteLink()],
      [
        'image',
        'fa-image',
        'toolbar.image',
        'image picture photo',
        () => this.browseImageInput?.click(),
      ],
      ['emoji', 'fa-face-smile', 'toolbar.emoji', 'emoji', () => this.toggleEmojiPanel()],
      ['date', 'fa-calendar-plus', 'toolbar.date', 'date today', () => this.insertDateTime('date')],
      ['time', 'fa-clock', 'toolbar.time', 'time now', () => this.insertDateTime('time')],
    ].map(([name, icon, label, words, run]) => ({ name, icon, label, words, run }));
  }

  // "/query" right before the caret, at the start of its line
  slashQueryAtCaret() {
    const range = this.caretRange();
    if (!range || !range.collapsed || range.startContainer.nodeType !== Node.TEXT_NODE) return null;
    const node = range.startContainer;
    if (node.parentElement.closest('pre, code, a')) return null;
    const before = node.data.slice(0, range.startOffset);
    const match = before.match(new RegExp(`/([^\\s/]{0,${MAX_QUERY}})$`));
    if (!match) return null;
    const start = before.length - match[0].length;
    // Nothing but empty text from the line's start to the "/"
    const line = node.parentElement.closest(LINE) || this.topBlockOf(node);
    if (!line || !this.richEditor.contains(line)) return null;
    const lead = document.createRange();
    lead.setStart(line, 0);
    lead.setEnd(node, start);
    if (lead.toString().replace(/[\u200b\u00a0\s]/g, '')) return null;
    return { node, start, end: range.startOffset, query: match[1], line };
  }

  slashMatches(query) {
    const term = this.normalizeForSearch(query);
    const commands = this.slashCommands();
    if (!term) return commands;
    const scored = commands
      .map((command) => {
        const label = this.normalizeForSearch(i18n.t(command.label));
        const words = this.normalizeForSearch(command.words);
        if (label.startsWith(term)) return { command, rank: 0 };
        if (label.split(/\s+/).some((w) => w.startsWith(term))) return { command, rank: 1 };
        if (words.split(/\s+/).some((w) => w.startsWith(term))) return { command, rank: 2 };
        if (label.includes(term)) return { command, rank: 3 };
        return null;
      })
      .filter(Boolean);
    return scored.sort((a, b) => a.rank - b.rank).map((s) => s.command);
  }

  // Show (or hide) the menu for the "/" being typed
  updateSlashMenu() {
    const query = this.slashQueryAtCaret();
    const dismissed = this.slashDismissed;
    if (!query || (dismissed && dismissed.node === query.node && dismissed.start === query.start)) {
      if (!query) this.slashDismissed = null;
      return this.hideSlashMenu();
    }
    this.slashQuery = query;
    const commands = this.slashMatches(query.query);
    // Nothing matches after a few letters: the "/" was not meant for the menu
    if (!commands.length && query.query.length > 3) return this.hideSlashMenu();
    const menu = this.slashMenu;
    menu.innerHTML = '';
    if (!commands.length) {
      const empty = document.createElement('div');
      empty.className = 'menu-empty';
      empty.textContent = i18n.t('slashMenu.noMatch');
      menu.appendChild(empty);
    }
    commands.forEach((command, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'menu-item';
      item.dataset.command = command.name;
      item.classList.toggle('active', index === 0);
      item.innerHTML = `<i class="fas ${command.icon}"></i><span></span>`;
      item.querySelector('span').textContent = i18n.t(command.label);
      // The caret stays in the note while choosing
      item.addEventListener('mousedown', (e) => e.preventDefault());
      item.addEventListener('click', () => this.chooseSlashCommand(command));
      item.addEventListener('mousemove', () => this.setSlashIndex(index));
      menu.appendChild(item);
    });
    this.slashChoices = commands;
    this.slashIndex = 0;
    const caret = document.createRange();
    caret.setStart(query.node, query.end);
    const rect = caret.getClientRects()[0] || query.node.parentElement.getBoundingClientRect();
    this.positionMenu(menu, rect.left, rect.bottom + 4);
  }

  setSlashIndex(index) {
    const items = [...this.slashMenu.querySelectorAll('.menu-item')];
    if (!items.length) return;
    this.slashIndex = (index + items.length) % items.length;
    items.forEach((item, i) => item.classList.toggle('active', i === this.slashIndex));
    items[this.slashIndex].scrollIntoView({ block: 'nearest' });
  }

  hideSlashMenu() {
    this.slashMenu?.classList.add('hidden');
    this.slashChoices = null;
  }

  // "/…" goes, the line stays (empty lines keep a <br>), then the command runs there
  chooseSlashCommand(command) {
    const query = this.slashQuery;
    this.hideSlashMenu();
    if (!query || !query.node.isConnected) return;
    const range = document.createRange();
    range.setStart(query.node, query.start);
    range.setEnd(query.node, Math.min(query.end, query.node.length));
    range.deleteContents();
    const line = query.line;
    if (
      line.isConnected &&
      !line.textContent.replace(/\u200b/g, '') &&
      !line.querySelector('br, img')
    ) {
      line.appendChild(document.createElement('br'));
    }
    this.placeCaret(
      query.node.isConnected ? query.node : line,
      query.node.isConnected ? query.start : 0
    );
    this.trackContentChanges();
    command.run();
  }

  // A note link: "[[" in place of "/", and the note suggestions open
  startNoteLink() {
    document.execCommand('insertText', false, '[[');
    this.updateNoteLinkSuggestions();
  }

  handleSlashKeys(e) {
    if (!this.slashChoices || this.slashMenu.classList.contains('hidden')) return;
    const stop = () => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    if (e.key === 'ArrowDown') {
      stop();
      this.setSlashIndex(this.slashIndex + 1);
    } else if (e.key === 'ArrowUp') {
      stop();
      this.setSlashIndex(this.slashIndex - 1);
    } else if ((e.key === 'Enter' || e.key === 'Tab') && this.slashChoices.length) {
      stop();
      this.chooseSlashCommand(this.slashChoices[this.slashIndex]);
    } else if (e.key === 'Escape') {
      stop();
      // Closed for this "/": typing on does not open it again
      const query = this.slashQuery;
      this.slashDismissed = query && { node: query.node, start: query.start };
      this.hideSlashMenu();
    }
  }

  setupSlashMenu() {
    if (!this.richEditor || !this.slashMenu) return;
    // On the editor's parent, in the capture phase: before the editor's own key handlers (Enter
    // would otherwise make a new line, the arrows move the caret)
    this.richEditor.parentElement.addEventListener(
      'keydown',
      (e) => {
        if (this.richEditor.contains(e.target)) this.handleSlashKeys(e);
      },
      true
    );
    this.richEditor.addEventListener('input', () => this.updateSlashMenu());
    this.richEditor.addEventListener('keyup', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) this.updateSlashMenu();
    });
    this.richEditor.addEventListener('mousedown', () => this.hideSlashMenu());
    this.richEditor.addEventListener('blur', () => setTimeout(() => this.hideSlashMenu(), 150));
  }
}
