// The first start: the app speaks the computer's language (Turkish, else English) and opens on a
// short welcome note that shows the main things to know, with a few tasks to try. It is an
// ordinary note: it can be edited or deleted like any other. Only a truly new install gets it
// (not an upgrade from the older storage, and not the app tests).

import { i18n } from '../i18n.js';

export class WelcomeFeature {
  // Turkish on a Turkish system, English everywhere else
  systemLanguage() {
    const languages = [...(navigator.languages || []), navigator.language].filter(Boolean);
    return languages.some((lang) => /^tr\b/i.test(lang)) ? 'tr' : 'en';
  }

  welcomeNoteHtml() {
    const t = (key) => this.escapeHtml(i18n.t(`welcome.${key}`));
    const tip = (key) => `<li>${i18n.t(`welcome.${key}`)}</li>`;
    const tasks = ['try1', 'try2', 'try3'].map((key) => this.checklistItemHtml(t(key))).join('');
    return (
      `<p>${t('intro')}</p>` +
      `<h3>${t('startTitle')}</h3>` +
      `<ul>${['tipNew', 'tipEdit', 'tipSlash', 'tipLink', 'tipQuick', 'tipMenu'].map(tip).join('')}</ul>` +
      `<h3>${t('tryTitle')}</h3>` +
      `<div class="checklist">${tasks}</div>` +
      `<p>${t('outro')}</p>`
    );
  }

  // The welcome note, saved and opened (only when there are no notes yet)
  async addWelcomeNote() {
    if (this.notes.length) return null;
    const now = new Date().toISOString();
    const note = {
      id: this.newId(),
      title: i18n.t('welcome.title'),
      content: this.welcomeNoteHtml(),
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      mood: null,
      weather: null,
      tags: [],
      isLocked: false,
      folderId: null,
      history: [{ type: 'created', ts: now }],
    };
    this.notes.unshift(note);
    await this.saveNotes();
    this.updateNotesList();
    this.updateStats();
    this.selectNote(note);
    return note;
  }
}
