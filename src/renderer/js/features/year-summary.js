// The year in review: one card with a year's notes, words and writing days, the months written
// most, the most frequent mood, the longest streak, the most used tags and the longest note. The
// card can be saved as an image to share.

import { i18n } from '../i18n.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export class YearSummaryFeature {
  // The years with notes, the newest first (this year even without notes yet)
  summaryYears() {
    const years = new Set([this.dashboardNow().getFullYear()]);
    this.notes.forEach((note) => years.add(new Date(note.createdAt).getFullYear()));
    return [...years].sort((a, b) => b - a);
  }

  yearSummary(year) {
    const notes = this.notes.filter((n) => new Date(n.createdAt).getFullYear() === year);
    const months = Array.from({ length: 12 }, (_, month) => ({ month, notes: 0 }));
    notes.forEach((n) => (months[new Date(n.createdAt).getMonth()].notes += 1));
    const topMonth = months.reduce((best, m) => (m.notes > best.notes ? m : best), months[0]);

    const moods = this.spreadOf('mood', this.findMoodButton).map((entry) => ({
      ...entry,
      count: notes.filter((n) => n.mood === entry.key).length,
    }));
    const withMood = notes.filter((n) => n.mood).length;
    const topMood = moods.filter((m) => m.count > 0).sort((a, b) => b.count - a.count)[0] || null;

    // The longest run of writing days within the year
    const days = [...this.writingDays()].filter((key) => key.startsWith(`${year}-`)).sort();
    let streak = { length: 0, from: null, to: null };
    let runStart = null;
    let previous = null;
    days.forEach((key) => {
      const date = new Date(`${key}T12:00:00`);
      if (!previous || Math.round((date - previous) / DAY_MS) !== 1) runStart = date;
      const length = Math.round((date - runStart) / DAY_MS) + 1;
      if (length > streak.length) streak = { length, from: runStart, to: date };
      previous = date;
    });

    const tags = new Map();
    notes.forEach((n) =>
      (n.tags || []).forEach((tag) => {
        const key = this.tagKey(tag);
        const entry = tags.get(key) || { name: tag, count: 0 };
        entry.count += 1;
        tags.set(key, entry);
      })
    );
    const longest = notes
      .filter((n) => !this.isNoteLockedForView(n))
      .sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0))[0];

    return {
      year,
      notes: notes.length,
      words: notes.reduce((sum, n) => sum + (n.wordCount || 0), 0),
      days: days.length,
      months,
      topMonth: topMonth.notes ? topMonth : null,
      topMood:
        topMood && withMood
          ? { ...topMood, share: Math.round((topMood.count / withMood) * 100) }
          : null,
      streak,
      tags: [...tags.values()].sort((a, b) => b.count - a.count).slice(0, 3),
      longest: longest && longest.wordCount ? longest : null,
    };
  }

  showYearSummary(year = this.summaryYear || this.dashboardNow().getFullYear()) {
    this.summaryYear = year;
    this.showScreen('summary');
    this.renderYearSummary();
  }

  renderYearSummary() {
    const s = this.yearSummary(this.summaryYear);
    const locale = this.getLocale();
    const number = (n) => n.toLocaleString(locale);
    const monthName = (month, style = 'long') =>
      new Date(2024, month, 1).toLocaleDateString(locale, { month: style });
    const years = this.summaryYears();
    this.summaryTitle.textContent = i18n.t('summary.title', { year: s.year });
    this.summaryPrevBtn.disabled = s.year <= years[years.length - 1];
    this.summaryNextBtn.disabled = s.year >= years[0];

    const card = this.summaryCard;
    card.innerHTML = '';
    if (!s.notes) {
      card.innerHTML = `<div class="empty-state empty-state-large"><i class="fas fa-feather"></i><p></p></div>`;
      card.querySelector('p').textContent = i18n.t('summary.empty', { year: s.year });
      this.summarySaveBtn.disabled = true;
      return;
    }
    this.summarySaveBtn.disabled = false;

    const section = (label) => {
      const el = document.createElement('section');
      el.className = 'summary-section';
      el.innerHTML = '<h3 class="summary-label"></h3>';
      el.querySelector('h3').textContent = label;
      card.appendChild(el);
      return el;
    };
    const line = (parent, text, className = 'summary-line') => {
      const p = document.createElement('p');
      p.className = className;
      p.textContent = text;
      parent.appendChild(p);
      return p;
    };

    // The year and its numbers
    const head = document.createElement('div');
    head.className = 'summary-head';
    head.innerHTML = `<div class="summary-year"></div><div class="summary-brand"><img src="../../assets/icons/source/capnote.svg" alt="" /> Capnote</div>`;
    head.querySelector('.summary-year').textContent = s.year;
    card.appendChild(head);
    const figures = document.createElement('div');
    figures.className = 'summary-figures';
    [
      [s.notes, 'summary.notes', 'fa-file-lines', 'blue'],
      [s.words, 'summary.words', 'fa-pen-nib', 'rose'],
      [s.days, 'summary.days', 'fa-calendar-check', 'green'],
    ].forEach(([value, key, icon, tone]) => {
      const figure = document.createElement('div');
      figure.className = 'summary-figure';
      figure.innerHTML = `<i class="fas ${icon} tone-${tone}"></i><span class="summary-figure-value"></span><span class="summary-figure-label"></span>`;
      figure.querySelector('.summary-figure-value').textContent = number(value);
      figure.querySelector('.summary-figure-label').textContent = i18n.t(key);
      figures.appendChild(figure);
    });
    card.appendChild(figures);

    // The months: a column each, the most written one marked
    const monthsSection = section(i18n.t('summary.months'));
    if (s.topMonth) {
      line(
        monthsSection,
        i18n.t('summary.topMonth', { month: monthName(s.topMonth.month), count: s.topMonth.notes })
      );
    }
    const columns = document.createElement('div');
    columns.className = 'summary-months';
    const max = Math.max(...s.months.map((m) => m.notes), 1);
    s.months.forEach((m) => {
      const column = document.createElement('div');
      column.className = 'summary-month';
      column.classList.toggle('is-top', !!s.topMonth && m.month === s.topMonth.month);
      column.title = `${monthName(m.month)}: ${m.notes}`;
      column.innerHTML =
        '<span class="summary-month-bar"></span><span class="summary-month-name"></span>';
      column.querySelector('.summary-month-bar').style.height =
        `${Math.max(4, (m.notes / max) * 100)}%`;
      column.querySelector('.summary-month-name').textContent = monthName(m.month, 'short');
      columns.appendChild(column);
    });
    monthsSection.appendChild(columns);

    // The mood, the streak, the tags and the longest note, side by side
    const facts = document.createElement('div');
    facts.className = 'summary-facts';
    card.appendChild(facts);
    const fact = (label, icon, tone, text, sub) => {
      const el = document.createElement('div');
      el.className = 'summary-fact';
      el.innerHTML = `<span class="summary-fact-icon"><i></i></span><div><div class="summary-label"></div><div class="summary-fact-text"></div><div class="summary-fact-sub"></div></div>`;
      el.querySelector('.summary-fact-icon').classList.add(`tone-${tone}`);
      el.querySelector('i').className = icon;
      el.querySelector('.summary-label').textContent = label;
      el.querySelector('.summary-fact-text').textContent = text;
      el.querySelector('.summary-fact-sub').textContent = sub || '';
      facts.appendChild(el);
    };
    if (s.topMood) {
      fact(
        i18n.t('summary.mood'),
        s.topMood.button.querySelector('i').className,
        'amber',
        s.topMood.button.title,
        i18n.t('summary.moodShare', { share: s.topMood.share })
      );
    }
    if (s.streak.length > 1) {
      const date = (d) => d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
      fact(
        i18n.t('summary.streak'),
        'fas fa-fire',
        'red',
        i18n.t('summary.streakDays', { count: s.streak.length }),
        `${date(s.streak.from)} – ${date(s.streak.to)}`
      );
    }
    if (s.tags.length) {
      fact(
        i18n.t('summary.tags'),
        'fas fa-tags',
        'teal',
        s.tags.map((t) => `#${t.name}`).join('  '),
        i18n.t('summary.tagsSub', { count: s.tags[0].count })
      );
    }
    if (s.longest) {
      fact(
        i18n.t('summary.longest'),
        'fas fa-scroll',
        'violet',
        this.displayTitle(s.longest),
        i18n.t('summary.longestWords', { count: number(s.longest.wordCount) })
      );
    }
  }

  // The card as a PNG, captured as it is shown: for the moment, the page header steps aside and
  // the messages close, so the whole card is in view and nothing covers it
  async saveYearSummaryImage() {
    const card = this.summaryCard;
    this.hideNotification();
    this.summaryScreen.classList.add('is-capturing');
    card.scrollIntoView({ block: 'start' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const rect = card.getBoundingClientRect();
    let result;
    try {
      const data = await window.electronAPI.captureArea({
        x: Math.floor(rect.left),
        y: Math.floor(rect.top),
        width: Math.ceil(rect.width),
        height: Math.ceil(Math.min(rect.height, window.innerHeight - rect.top)),
      });
      this.summaryScreen.classList.remove('is-capturing');
      result = data
        ? await window.electronAPI.savePng({ data, fileName: `capnote-${this.summaryYear}.png` })
        : { ok: false };
    } catch (err) {
      console.error('Saving the summary failed:', err);
      result = { ok: false };
    }
    this.summaryScreen.classList.remove('is-capturing');
    this.reportSave(result, 'summary.saved');
  }

  setupYearSummary() {
    this.summaryOpenBtn?.addEventListener('click', () => this.showYearSummary());
    this.summaryPrevBtn?.addEventListener('click', () =>
      this.showYearSummary(this.summaryYear - 1)
    );
    this.summaryNextBtn?.addEventListener('click', () =>
      this.showYearSummary(this.summaryYear + 1)
    );
    this.summarySaveBtn?.addEventListener('click', () => this.saveYearSummaryImage());
    this.summaryBackBtn?.addEventListener('click', () => this.showWelcome());
  }
}
