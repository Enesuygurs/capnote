// Note templates: a new note can start as a journal entry, meeting notes or a weekly plan instead
// of an empty page. The text is in the language the app is in.

import { i18n } from '../i18n.js';

export class TemplatesFeature {
  // name -> { icon, title(date), html() }
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
        title: (d) => i18n.t('noteTemplates.journalTitle', { date: longDate(d) }),
        html: () =>
          `<h2>${t('journalHow')}</h2><p><br></p>` +
          `<h3>${t('journalGrateful')}</h3><ol><li><br></li><li><br></li><li><br></li></ol>` +
          `<h3>${t('journalTomorrow')}</h3>${task()}<p><br></p>`,
      },
      meeting: {
        icon: 'fa-people-group',
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
    };
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
    const rect = this.newNoteTemplatesBtn.closest('.new-note-split').getBoundingClientRect();
    this.positionMenu(menu, rect.left, rect.bottom + 4);
    menu.style.minWidth = `${rect.width}px`;
  }

  setupTemplates() {
    // Item labels come from the translations; the icons are fixed
    const templates = this.noteTemplates();
    this.templateMenu.querySelectorAll('[data-template]').forEach((item) => {
      const icon = item.querySelector('i');
      if (icon && templates[item.dataset.template]) {
        icon.className = `fas ${templates[item.dataset.template].icon}`;
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
