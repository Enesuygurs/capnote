// Note templates: a new note can start as a journal entry, meeting notes, a weekly plan or book
// notes instead of an empty page (their text in the language the app is in), or as one of the
// user's own templates: a note saved as a template (its note menu), kept in the "templates"
// collection. A template keeps the note's text and look; its tasks start unticked.

import { i18n } from '../i18n.js';

export class TemplatesFeature {
  // name -> { icon, tone (the icon's color), title(date), html() }
  noteTemplates() {
    const t = (key, params) => this.escapeHtml(i18n.t(`noteTemplates.${key}`, params));
    const locale = this.getLocale();
    const task = () => `<div class="checklist">${this.checklistItemHtml()}</div>`;
    const tasks = (count) =>
      `<div class="checklist">${Array.from({ length: count }, () => this.checklistItemHtml()).join('')}</div>`;
    const longDate = (d) =>
      d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

    return {
      journal: {
        icon: 'fa-book',
        tone: 'violet',
        title: (d) => i18n.t('noteTemplates.journalTitle', { date: longDate(d) }),
        html: () =>
          `<h2>${t('journalHow')}</h2><p><br></p>` +
          `<h3>${t('journalGrateful')}</h3><ol><li><br></li><li><br></li><li><br></li></ol>` +
          `<h3>${t('journalTomorrow')}</h3>${task()}<p><br></p>`,
      },
      meeting: {
        icon: 'fa-people-group',
        tone: 'amber',
        title: (d) => i18n.t('noteTemplates.meetingTitle', { date: longDate(d) }),
        html: () =>
          `<h3>${t('meetingPeople')}</h3><ul><li><br></li></ul>` +
          `<h3>${t('meetingAgenda')}</h3><ol><li><br></li></ol>` +
          `<h3>${t('meetingNotes')}</h3><p><br></p>` +
          `<h3>${t('meetingDecisions')}</h3><ul><li><br></li></ul>` +
          `<h3>${t('meetingActions')}</h3>${task()}<p><br></p>`,
      },
      weekly: {
        icon: 'fa-calendar-week',
        tone: 'green',
        title: (d) => {
          // The week from Monday to Sunday that holds the day
          const monday = new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate() - ((d.getDay() + 6) % 7)
          );
          const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
          const short = (x) => x.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
          return i18n.t('noteTemplates.weeklyTitle', { from: short(monday), to: short(sunday) });
        },
        html: () => {
          const days = Array.from({ length: 7 }, (_, i) =>
            new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'long' })
          );
          return (
            `<h3>${t('weeklyGoals')}</h3>${tasks(3)}` +
            days.map((day) => `<h3>${this.escapeHtml(day)}</h3>${task()}`).join('') +
            `<h3>${t('weeklyNotes')}</h3><p><br></p>`
          );
        },
      },
      book: {
        icon: 'fa-book-open',
        tone: 'rose',
        title: () => i18n.t('noteTemplates.bookTitle'),
        html: () =>
          `<h3>${t('bookAbout')}</h3>` +
          `<ul><li><b>${t('bookAuthor')}:</b> </li>` +
          `<li><b>${t('bookStarted')}:</b> ${this.escapeHtml(longDate(new Date()))}</li></ul>` +
          `<h3>${t('bookSummary')}</h3><p><br></p>` +
          `<h3>${t('bookQuotes')}</h3><blockquote><br></blockquote>` +
          `<h3>${t('bookThoughts')}</h3><p><br></p>` +
          `<h3>${t('bookRating')}</h3><p>☆☆☆☆☆</p>`,
      },
    };
  }

  // ============ The user's templates ============
  loadUserTemplates() {
    const stored = this.storedData?.templates;
    this.userTemplates = Array.isArray(stored)
      ? stored.filter((t) => t && typeof t.content === 'string')
      : [];
  }

  async saveUserTemplates() {
    await this.persist('templates', this.userTemplates || []);
  }

  // A note's text as a template: its tasks unticked (each gets a new id when used)
  templateContentOf(note) {
    const body = this.parseInertHtml(note.content || '');
    body
      .querySelectorAll('input[type="checkbox"]')
      .forEach((box) => box.removeAttribute('checked'));
    return body.innerHTML;
  }

  // Save a note as a template, named after its title; one with that name already is replaced
  async saveNoteAsTemplate(note) {
    if (!note || note.isLocked || this.isFileNote?.(note)) return;
    // The open note's latest text first
    if (note === this.currentNote && this.isEditorOpen?.()) this.saveNote(true);
    const name = (note.title || '').trim() || i18n.t('noteTemplates.untitled');
    const template = {
      id: this.newId(),
      name,
      content: this.templateContentOf(note),
      formatting: { ...this.getDefaultFormatting(), ...(note.formatting || {}) },
      tags: [...(note.tags || [])],
      createdAt: new Date().toISOString(),
    };
    const same = this.userTemplates.findIndex((t) => t.name === name);
    if (same >= 0) this.userTemplates[same] = { ...template, id: this.userTemplates[same].id };
    else this.userTemplates.push(template);
    await this.saveUserTemplates();
    this.showNotification(
      i18n.t(same >= 0 ? 'noteTemplates.updated' : 'noteTemplates.saved', { name }),
      'success'
    );
  }

  async removeUserTemplate(id) {
    const template = this.userTemplates.find((t) => t.id === id);
    if (!template) return;
    this.userTemplates = this.userTemplates.filter((t) => t.id !== id);
    await this.saveUserTemplates();
    this.showNotification(i18n.t('noteTemplates.removed', { name: template.name }), 'success');
  }

  // A new note from one of the user's templates: its text with fresh task ids, and its tags
  createNoteFromUserTemplate(id) {
    const template = this.userTemplates.find((t) => t.id === id);
    this.createNewNote();
    if (!template) return;
    this.noteTitle.value = template.name;
    this.showTitleInList();
    const body = this.parseInertHtml(template.content);
    body.querySelectorAll('.checklist-item').forEach((item) => {
      const box = item.querySelector('input[type="checkbox"]');
      const label = item.querySelector('label');
      if (!box || !label) return;
      const fresh = document.createElement('div');
      fresh.innerHTML = this.checklistItemHtml();
      box.id = fresh.querySelector('input').id;
      label.setAttribute('for', box.id);
    });
    this.richEditor.innerHTML = body.innerHTML;
    this.tags = Array.isArray(template.tags) ? [...template.tags] : [];
    this.updateTagsDisplay();
    this.restoreCheckboxStates();
    this.updateWordCount();
    this.trackContentChanges();
    this.resetEditorHistory?.();
    const first = this.richEditor.querySelector('p, li, label');
    if (first) this.placeCaret(first, 0);
  }

  // The user's templates under the built-in ones, each with a button that deletes it
  renderUserTemplates() {
    const list = document.getElementById('userTemplatesList');
    const divider = document.getElementById('userTemplatesDivider');
    if (!list) return;
    list.innerHTML = '';
    divider?.classList.toggle('hidden', !this.userTemplates.length);
    [...this.userTemplates]
      .sort((a, b) => a.name.localeCompare(b.name, this.getLocale()))
      .forEach((template) => {
        const row = document.createElement('div');
        row.className = 'menu-item user-template';
        row.setAttribute('role', 'menuitem');
        row.tabIndex = 0;
        row.innerHTML =
          '<i class="fas fa-shapes tone-accent"></i><span></span>' +
          '<button type="button" class="btn-icon btn-icon-xs user-template-remove">' +
          '<i class="fas fa-xmark"></i></button>';
        row.querySelector('span').textContent = template.name;
        const remove = row.querySelector('.user-template-remove');
        remove.title = i18n.t('noteTemplates.remove');
        remove.setAttribute('aria-label', i18n.t('noteTemplates.remove'));
        remove.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.removeUserTemplate(template.id);
          this.renderUserTemplates();
          if (!this.userTemplates.length) this.templateMenu.classList.add('hidden');
        });
        const open = (e) => {
          e.stopPropagation();
          this.templateMenu.classList.add('hidden');
          this.createNoteFromUserTemplate(template.id);
        };
        row.addEventListener('click', open);
        row.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') open(e);
        });
        list.appendChild(row);
      });
  }

  // A new note filled from a template, ready to write in
  createNoteFromTemplate(name) {
    const template = this.noteTemplates()[name];
    this.createNewNote();
    if (!template) return;
    const now = new Date();
    this.noteTitle.value = template.title(now);
    this.showTitleInList();
    this.richEditor.innerHTML = template.html();
    this.restoreCheckboxStates();
    this.updateWordCount();
    this.trackContentChanges();
    this.resetEditorHistory?.();
    // Start writing at the first empty line
    const first = this.richEditor.querySelector('p, li, label');
    if (first) this.placeCaret(first, 0);
  }

  showTemplateMenu() {
    const menu = this.templateMenu;
    if (!menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
      return;
    }
    this.renderUserTemplates();
    const rect = this.newNoteTemplatesBtn.closest('.new-note-split').getBoundingClientRect();
    this.positionMenu(menu, rect.left, rect.bottom + 4);
    menu.style.minWidth = `${rect.width}px`;
  }

  setupTemplates() {
    // Item labels come from the translations; the icons and their colors are fixed
    const templates = this.noteTemplates();
    this.templateMenu.querySelectorAll('[data-template]').forEach((item) => {
      const icon = item.querySelector('i');
      if (icon && templates[item.dataset.template]) {
        const { icon: name, tone } = templates[item.dataset.template];
        icon.className = `fas ${name} tone-${tone}`;
      }
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.templateMenu.classList.add('hidden');
        const name = item.dataset.template;
        if (name === 'blank') this.createNewNote();
        else this.createNoteFromTemplate(name);
      });
    });
    this.newNoteTemplatesBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showTemplateMenu();
    });
    document.addEventListener('click', () => this.templateMenu.classList.add('hidden'));
  }
}
