// The mood journey on the overview: the mood of each of the last 7 or 30 days, and the patterns
// of the weekdays ("On Mondays you usually feel tired"). A day's mood is that of its latest note
// with one; a pattern needs a few notes with a mood on that weekday and one mood in most of them.

import { i18n } from '../i18n.js';

// A weekday shows a pattern from this many notes with a mood on it
const PATTERN_MIN_NOTES = 3;
const PATTERNS_SHOWN = 3;

export class MoodJourneyFeature {
  // dayKey -> the mood of that day's latest note with one
  dayMoods() {
    const latest = new Map();
    this.notes.forEach((note) => {
      if (!note.mood) return;
      const key = this.dayKey(note.createdAt);
      const known = latest.get(key);
      if (!known || new Date(note.createdAt) > new Date(known.createdAt)) latest.set(key, note);
    });
    return new Map([...latest].map(([key, note]) => [key, note.mood]));
  }

  // The last `count` days up to today, the oldest first
  moodJourneyDays(count) {
    const moods = this.dayMoods();
    const today = this.dashboardNow();
    const days = [];
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i, 12);
      const key = this.dayKey(date);
      days.push({ date, key, mood: moods.get(key) || null });
    }
    return days;
  }

  // The weekdays where one mood is in most of the notes, the clearest first
  moodPatterns() {
    const byWeekday = Array.from({ length: 7 }, () => new Map());
    this.notes.forEach((note) => {
      if (!note.mood || !this.findMoodButton(note.mood)) return;
      const counts = byWeekday[new Date(note.createdAt).getDay()];
      counts.set(note.mood, (counts.get(note.mood) || 0) + 1);
    });
    const patterns = [];
    byWeekday.forEach((counts, weekday) => {
      const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
      if (total < PATTERN_MIN_NOTES) return;
      const [mood, count] = [...counts].sort((x, y) => y[1] - x[1])[0];
      if (count * 2 <= total) return;
      patterns.push({ weekday, mood, share: count / total, total });
    });
    return patterns.sort((x, y) => y.share - x.share || y.total - x.total).slice(0, PATTERNS_SHOWN);
  }

  renderMoodJourney() {
    const strip = this.moodStrip;
    if (!strip) return;
    const range = this.moodJourneyRange || 7;
    this.moodJourneyRangeTabs?.querySelectorAll('.segment').forEach((tab) => {
      tab.classList.toggle('active', Number(tab.dataset.range) === range);
    });
    const locale = this.getLocale();
    strip.innerHTML = '';
    strip.classList.toggle('is-month', range > 7);
    strip.style.setProperty('--days', range);
    this.moodJourneyDays(range).forEach(({ date, mood }) => {
      const cell = document.createElement('div');
      cell.className = 'mood-day';
      const button = mood && this.findMoodButton(mood);
      cell.innerHTML = '<span class="mood-day-mark"></span><span class="mood-day-label"></span>';
      const mark = cell.querySelector('.mood-day-mark');
      if (button) {
        mark.dataset.tone = mood;
        mark.appendChild(button.querySelector('i').cloneNode());
      } else {
        mark.classList.add('is-empty');
      }
      // A week names each day; a month numbers the Mondays and the first day
      const label = cell.querySelector('.mood-day-label');
      if (range <= 7) label.textContent = date.toLocaleDateString(locale, { weekday: 'short' });
      else if (date.getDay() === 1 || date.getDate() === 1) label.textContent = date.getDate();
      cell.title = [
        date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
        button ? button.title : i18n.t('journey.noMood'),
      ].join(' · ');
      strip.appendChild(cell);
    });

    const list = this.moodPatternsList;
    list.innerHTML = '';
    const patterns = this.moodPatterns();
    if (!patterns.length) {
      list.innerHTML = `<p class="chart-empty">${i18n.t('journey.noPatterns')}</p>`;
      return;
    }
    patterns.forEach(({ weekday, mood }) => {
      const row = document.createElement('p');
      row.className = 'mood-pattern';
      row.innerHTML = '<span class="mood-pattern-icon"></span><span></span>';
      const icon = row.querySelector('.mood-pattern-icon');
      icon.dataset.tone = mood;
      icon.appendChild(this.findMoodButton(mood).querySelector('i').cloneNode());
      row.lastChild.textContent = i18n.t('journey.pattern', {
        days: i18n.t(`journey.weekdays.${weekday}`),
        feel: i18n.t(`journey.feel.${mood}`),
      });
      list.appendChild(row);
    });
  }

  setupMoodJourney() {
    this.moodJourneyRangeTabs?.addEventListener('click', (e) => {
      const tab = e.target.closest('.segment');
      if (!tab) return;
      this.moodJourneyRange = Number(tab.dataset.range);
      this.renderMoodJourney();
    });
  }
}
