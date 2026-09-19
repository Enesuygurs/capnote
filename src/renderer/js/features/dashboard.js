// The home page once there are notes: numbers about the writing (notes, active days, the writing
// streak, words this month), a calendar with each day's mood, how moods and weather are spread,
// and the words written per month. A note belongs to the day it was created.

import { i18n } from '../i18n.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_CHARTED = 6;

export class DashboardFeature {
  // "Now" for the overview; tests set dashboardToday to see a fixed day
  dashboardNow() {
    return this.dashboardToday ? new Date(this.dashboardToday) : new Date();
  }

  dayKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Days the user wrote on: a note created, or edited (from its history), that day
  writingDays() {
    const days = new Set();
    this.notes.forEach((note) => {
      if (note.createdAt) days.add(this.dayKey(note.createdAt));
      (note.history || []).forEach((entry) => entry.ts && days.add(this.dayKey(entry.ts)));
    });
    return days;
  }

  // The streak goes on while yesterday or today has writing; the longest is the best run ever
  writingStreaks(days = this.writingDays(), today = this.dashboardNow()) {
    const has = (date) => days.has(this.dayKey(date));
    let current = 0;
    let cursor = new Date(today);
    if (!has(cursor)) cursor = new Date(cursor.getTime() - DAY_MS);
    while (has(cursor)) {
      current += 1;
      cursor = new Date(cursor.getTime() - DAY_MS);
    }
    let longest = 0;
    let run = 0;
    let previous = null;
    [...days].sort().forEach((key) => {
      const date = new Date(`${key}T12:00:00`);
      run = previous && Math.round((date - previous) / DAY_MS) === 1 ? run + 1 : 1;
      longest = Math.max(longest, run);
      previous = date;
    });
    return { current, longest };
  }

  // Words of the notes created in each of the last months, oldest first
  monthlyWords(count = MONTHS_CHARTED, today = this.dashboardNow()) {
    const months = [];
    for (let i = count - 1; i >= 0; i--) {
      const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({ year: start.getFullYear(), month: start.getMonth(), words: 0 });
    }
    this.notes.forEach((note) => {
      const created = new Date(note.createdAt);
      const slot = months.find(
        (m) => m.year === created.getFullYear() && m.month === created.getMonth()
      );
      if (slot) slot.words += note.wordCount || 0;
    });
    return months;
  }

  // How many notes have each mood (or weather), most first
  spreadOf(field, findButton) {
    const counts = new Map();
    this.notes.forEach((note) => {
      if (note[field]) counts.set(note[field], (counts.get(note[field]) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count, button: findButton.call(this, key) }))
      .filter((entry) => entry.button)
      .sort((x, y) => y.count - x.count);
  }

  renderDashboard() {
    const hasNotes = this.notes.length > 0;
    this.welcomeScreen.classList.toggle('has-notes', hasNotes);
    this.dashboard.classList.toggle('hidden', !hasNotes);
    this.welcomeContent.classList.toggle('hidden', hasNotes);
    if (!hasNotes) return;

    const locale = this.getLocale();
    this.dashboardDate.textContent = this.dashboardNow().toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.renderStatTiles();
    this.renderCalendar();
    this.renderBarList(this.moodChart, this.spreadOf('mood', this.findMoodButton), 'mood');
    this.renderBarList(
      this.weatherChart,
      this.spreadOf('weather', this.findWeatherButton),
      'weather'
    );
    this.renderWordsChart();
  }

  renderStatTiles() {
    const days = this.writingDays();
    const { current, longest } = this.writingStreaks(days);
    const now = this.dashboardNow();
    const wordsThisMonth = this.notes
      .filter((n) => {
        const d = new Date(n.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, n) => sum + (n.wordCount || 0), 0);
    // Each figure has its own icon color
    const tiles = [
      ['notes', this.notes.length, 'fa-file-lines', 'blue'],
      ['activeDays', days.size, 'fa-calendar-check', 'green'],
      ['streak', current, 'fa-fire', 'amber'],
      ['longestStreak', longest, 'fa-trophy', 'violet'],
      ['wordsThisMonth', wordsThisMonth, 'fa-pen-nib', 'rose'],
    ];
    this.statTiles.innerHTML = '';
    tiles.forEach(([key, value, icon, tone]) => {
      const tile = document.createElement('div');
      tile.className = 'stat-tile';
      tile.dataset.stat = key;
      tile.innerHTML = `<i class="fas ${icon} tone-${tone}"></i><span class="stat-tile-value"></span><span class="stat-tile-label"></span>`;
      tile.querySelector('.stat-tile-value').textContent = value.toLocaleString(this.getLocale());
      tile.querySelector('.stat-tile-label').textContent = i18n.t(`dashboard.${key}`);
      this.statTiles.appendChild(tile);
    });
  }

  // ============ Calendar ============
  calendarMonth() {
    if (!this.calendarDate) {
      const now = this.dashboardNow();
      this.calendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return this.calendarDate;
  }

  moveCalendar(step) {
    const month = this.calendarMonth();
    this.calendarDate =
      step === 0
        ? new Date(this.dashboardNow().getFullYear(), this.dashboardNow().getMonth(), 1)
        : new Date(month.getFullYear(), month.getMonth() + step, 1);
    this.renderCalendar();
  }

  notesOfDay(key) {
    return this.notes
      .filter((n) => this.dayKey(n.createdAt) === key)
      .sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
  }

  renderCalendar() {
    const locale = this.getLocale();
    const month = this.calendarMonth();
    this.calendarTitle.textContent = month.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });

    // Weeks start on Monday
    this.calendarWeekdays.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const day = new Date(2024, 0, 1 + i); // 1 January 2024 was a Monday
      const label = document.createElement('span');
      label.textContent = day.toLocaleDateString(locale, { weekday: 'short' });
      this.calendarWeekdays.appendChild(label);
    }

    const byDay = new Map();
    this.notes.forEach((note) => {
      const key = this.dayKey(note.createdAt);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(note);
    });
    const todayKey = this.dayKey(this.dashboardNow());
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);

    this.calendarGrid.innerHTML = '';
    for (let i = 0; i < 42; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = this.dayKey(date);
      const notes = byDay.get(key) || [];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'calendar-day';
      cell.dataset.day = key;
      cell.classList.toggle('is-other-month', date.getMonth() !== month.getMonth());
      cell.classList.toggle('is-today', key === todayKey);
      cell.classList.toggle('is-selected', key === this.calendarSelectedDay);
      cell.classList.toggle('has-notes', notes.length > 0);
      const number = document.createElement('span');
      number.className = 'calendar-day-number';
      number.textContent = date.getDate();
      cell.appendChild(number);

      if (notes.length) {
        // The day's mood: the latest note of the day that has one
        const withMood = notes
          .filter((n) => n.mood)
          .sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt))[0];
        const button = withMood && this.findMoodButton(withMood.mood);
        const mark = document.createElement('span');
        mark.className = 'calendar-day-mark';
        if (button) {
          mark.dataset.tone = withMood.mood;
          mark.appendChild(button.querySelector('i').cloneNode());
        } else {
          mark.classList.add('is-dot');
        }
        cell.appendChild(mark);
        cell.title = [
          date.toLocaleDateString(locale, { day: 'numeric', month: 'long' }),
          i18n.t('tags.notesCount', { count: notes.length }),
          button ? button.title : null,
        ]
          .filter(Boolean)
          .join(' · ');
      }
      cell.addEventListener('click', () => this.selectCalendarDay(notes.length ? key : null));
      this.calendarGrid.appendChild(cell);
    }
    this.renderCalendarDay();
  }

  selectCalendarDay(key) {
    this.calendarSelectedDay = key === this.calendarSelectedDay ? null : key;
    this.calendarGrid.querySelectorAll('.calendar-day').forEach((cell) => {
      cell.classList.toggle('is-selected', cell.dataset.day === this.calendarSelectedDay);
    });
    this.renderCalendarDay();
  }

  // The notes of the chosen day, under the calendar
  renderCalendarDay() {
    const key = this.calendarSelectedDay;
    const notes = key ? this.notesOfDay(key) : [];
    this.calendarDayNotes.classList.toggle('hidden', !notes.length);
    if (!notes.length) return;
    this.calendarDayLabel.textContent = `${new Date(`${key}T12:00:00`).toLocaleDateString(
      this.getLocale(),
      { weekday: 'long', day: 'numeric', month: 'long' }
    )} · ${i18n.t('tags.notesCount', { count: notes.length })}`;
    this.calendarDayList.innerHTML = '';
    notes.forEach((note) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'calendar-note';
      const icon = this.findMoodButton(note.mood)?.querySelector('i');
      row.innerHTML =
        '<span class="calendar-note-mood"></span><span class="calendar-note-title"></span><span class="calendar-note-time"></span>';
      if (icon) {
        row.querySelector('.calendar-note-mood').dataset.tone = note.mood;
        row.querySelector('.calendar-note-mood').appendChild(icon.cloneNode());
      }
      row.querySelector('.calendar-note-title').textContent = this.displayTitle(note);
      row.querySelector('.calendar-note-time').textContent = new Date(
        note.createdAt
      ).toLocaleTimeString(this.getLocale(), { hour: '2-digit', minute: '2-digit' });
      row.addEventListener('click', () => this.selectNote(note));
      this.calendarDayList.appendChild(row);
    });
  }

  // ============ Charts ============
  // One bar per mood (or weather): its icon in its own color and its name say which it is;
  // the bars share one color, since they show one measure
  renderBarList(container, entries, field) {
    container.innerHTML = '';
    if (!entries.length) {
      container.innerHTML = `<p class="chart-empty">${i18n.t(`dashboard.no_${field}`)}</p>`;
      return;
    }
    const total = entries.reduce((sum, e) => sum + e.count, 0);
    const max = entries[0].count;
    entries.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      const share = Math.round((entry.count / total) * 100);
      row.title = `${entry.button.title}: ${entry.count} (${share}%)`;
      row.innerHTML = `<span class="bar-icon"></span><span class="bar-name"></span><span class="bar-track"><span class="bar-fill"></span></span><span class="bar-value"></span>`;
      row.querySelector('.bar-icon').dataset.tone = entry.key;
      row.querySelector('.bar-icon').appendChild(entry.button.querySelector('i').cloneNode());
      row.querySelector('.bar-name').textContent = entry.button.title;
      row.querySelector('.bar-fill').style.width = `${Math.max(4, (entry.count / max) * 100)}%`;
      row.querySelector('.bar-value').textContent = `${entry.count} · ${share}%`;
      container.appendChild(row);
    });
  }

  // Words per month: one column each, the current month labelled with its number
  renderWordsChart() {
    const months = this.monthlyWords();
    const max = Math.max(...months.map((m) => m.words), 1);
    const locale = this.getLocale();
    this.wordsChart.innerHTML = '';
    months.forEach((m, index) => {
      const column = document.createElement('div');
      column.className = 'column';
      const name = new Date(m.year, m.month, 1).toLocaleDateString(locale, { month: 'short' });
      column.title = `${new Date(m.year, m.month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}: ${m.words.toLocaleString(locale)} ${i18n.t('dashboard.words')}`;
      const last = index === months.length - 1;
      column.innerHTML = `<span class="column-value"></span><span class="column-track"><span class="column-fill"></span></span><span class="column-label"></span>`;
      column.querySelector('.column-value').textContent = last
        ? m.words.toLocaleString(locale)
        : '';
      column.querySelector('.column-fill').style.height =
        `${m.words ? Math.max(4, (m.words / max) * 100) : 0}%`;
      column.querySelector('.column-label').textContent = name;
      this.wordsChart.appendChild(column);
    });
  }

  setupDashboard() {
    this.calendarPrevBtn?.addEventListener('click', () => this.moveCalendar(-1));
    this.calendarNextBtn?.addEventListener('click', () => this.moveCalendar(1));
    this.calendarTodayBtn?.addEventListener('click', () => this.moveCalendar(0));
  }
}
