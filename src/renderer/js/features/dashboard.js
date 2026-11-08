// The home page once there are notes: numbers about the writing (notes, active days, the writing
// streak, words this month), a calendar with each day's mood, how moods and weather are spread,
// and the words written per month. A note belongs to the day it was created.

import { i18n } from '../i18n.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_CHARTED = 12;

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

  // How many notes have each mood (or weather), most first (all notes, or the ones given)
  spreadOf(field, findButton, notes = this.notes) {
    const counts = new Map();
    notes.forEach((note) => {
      if (note[field]) counts.set(note[field], (counts.get(note[field]) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count, button: findButton.call(this, key) }))
      .filter((entry) => entry.button)
      .sort((x, y) => y.count - x.count);
  }

  renderDashboard() {
    const locale = this.getLocale();
    this.dashboardDate.textContent = this.dashboardNow().toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.renderStatTiles();
    // The calendar draws the chosen day's notes and the mood and weather cards with it
    this.renderCalendar();
    this.renderWordsChart();
  }

  // Mood and weather over all notes, or over the chosen day's when a day is chosen in the
  // calendar; the cards' headers then name the day
  renderSpreads() {
    const key = this.calendarSelectedDay;
    const notes = key ? this.notesOfDay(key) : this.notes;
    const day = key
      ? new Date(`${key}T12:00:00`).toLocaleDateString(this.getLocale(), {
          day: 'numeric',
          month: 'long',
        })
      : null;
    this.renderBarList(
      this.moodChart,
      this.spreadOf('mood', this.findMoodButton, notes),
      'mood',
      this.moodTotal,
      day
    );
    this.renderBarList(
      this.weatherChart,
      this.spreadOf('weather', this.findWeatherButton, notes),
      'weather',
      this.weatherTotal,
      day
    );
  }

  renderStatTiles() {
    const days = this.writingDays();
    const { current, longest } = this.writingStreaks(days);
    const now = this.dashboardNow();
    // Words of the notes written in the last 30 days, today among them (a calendar month would
    // show next to nothing in its first days)
    const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const wordsLast30Days = this.notes
      .filter((n) => new Date(n.createdAt) >= since)
      .reduce((sum, n) => sum + (n.wordCount || 0), 0);
    // Each figure has its own icon color
    const tiles = [
      ['notes', this.notes.length, 'fa-file-lines', 'blue'],
      ['activeDays', days.size, 'fa-calendar-check', 'green'],
      ['streak', current, 'fa-fire', 'amber'],
      ['longestStreak', longest, 'fa-trophy', 'violet'],
      ['wordsLast30Days', wordsLast30Days, 'fa-pen-nib', 'rose'],
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
      if (this.isNoteHiddenByFolderLock(note)) return;
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
          cell.dataset.tone = withMood.mood;
          cell.classList.add('has-mood');
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

  // The notes of the chosen day, in the words card in place of the chart; choosing the day again
  // (or a day without notes) brings the chart back
  renderCalendarDay() {
    const key = this.calendarSelectedDay;
    const notes = key ? this.notesOfDay(key) : [];
    this.calendarDayNotes.classList.toggle('hidden', !notes.length);
    this.wordsCard?.classList.toggle('is-showing-day', notes.length > 0);
    this.renderSpreads();
    if (!notes.length) return;
    this.calendarDayLabel.textContent = `${new Date(`${key}T12:00:00`).toLocaleDateString(
      this.getLocale(),
      { weekday: 'long', day: 'numeric', month: 'long' }
    )} · ${i18n.t('tags.notesCount', { count: notes.length })}`;
    this.calendarDayList.innerHTML = '';
    notes.forEach((note) => this.calendarDayList.appendChild(this.dayNoteRow(note)));
  }

  // A note of a day: its mood, its title and the time it was written; it opens the note
  dayNoteRow(note) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'calendar-note';
    const icon = this.findMoodButton(note.mood)?.querySelector('i');
    row.innerHTML =
      '<span class="calendar-note-mood"></span><span class="calendar-note-title"></span><span class="calendar-note-time"></span>';
    if (icon) {
      row.querySelector('.calendar-note-mood').dataset.tone = note.mood;
      row.querySelector('.calendar-note-mood').appendChild(icon.cloneNode());
    } else {
      // A note with no mood: a plain note icon, so its title is not left after an empty gap
      row.querySelector('.calendar-note-mood').innerHTML = '<i class="fas fa-file-lines"></i>';
    }
    row.querySelector('.calendar-note-title').textContent = this.displayTitle(note);
    row.querySelector('.calendar-note-time').textContent = new Date(
      note.createdAt
    ).toLocaleTimeString(this.getLocale(), { hour: '2-digit', minute: '2-digit' });
    row.addEventListener('click', () => this.selectNote(note));
    return row;
  }

  // ============ Charts ============
  // One bar per mood (or weather): its icon in its own color and its name say which it is;
  // the bars share one color, since they show one measure
  // Each mood (or weather) as a tile: its icon on a tint of its color, its name and share, and a
  // bar in its color; the card's header says how many notes have one, and for a chosen day, which
  // day it is
  renderBarList(container, entries, field, totalLabel, day = null) {
    container.innerHTML = '';
    container.classList.toggle('is-empty', !entries.length);
    const total = entries.reduce((sum, e) => sum + e.count, 0);
    if (totalLabel) {
      const count = total ? i18n.t('tags.notesCount', { count: total }) : '';
      totalLabel.textContent = day ? [day, count].filter(Boolean).join(' · ') : count;
      totalLabel.classList.toggle('is-day', !!day);
    }
    if (!entries.length) {
      const empty = day ? `dashboard.dayNo_${field}` : `dashboard.no_${field}`;
      container.innerHTML = `<p class="chart-empty">${i18n.t(empty)}</p>`;
      return;
    }
    const max = entries[0].count;
    entries.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.dataset.tone = entry.key;
      const share = Math.round((entry.count / total) * 100);
      row.title = `${entry.button.title}: ${entry.count} (${share}%)`;
      row.innerHTML = `<span class="bar-icon"></span><span class="bar-body"><span class="bar-line"><span class="bar-name"></span><span class="bar-value"></span></span><span class="bar-track"><span class="bar-fill"></span></span></span>`;
      row.querySelector('.bar-icon').appendChild(entry.button.querySelector('i').cloneNode());
      row.querySelector('.bar-name').textContent = entry.button.title;
      row.querySelector('.bar-fill').style.width = `${Math.max(4, (entry.count / max) * 100)}%`;
      row.querySelector('.bar-value').textContent = `${entry.count} · ${share}%`;
      container.appendChild(row);
    });
  }

  // Words per month as an area chart: the last 12 months as a smooth line in the accent over a fill
  // that fades down, on a grid with its values; the current month's point is filled. There are no
  // numbers on the chart itself. The grid and the months are drawn even with no words, so the card
  // is never empty. Hovering a month shows a guide line and the month's words.
  renderWordsChart() {
    this.wordsMonths = this.monthlyWords();
    const total = this.wordsMonths.reduce((sum, m) => sum + m.words, 0);
    if (this.wordsTotal) {
      this.wordsTotal.textContent = i18n.t('dashboard.wordsTotal', {
        count: total.toLocaleString(this.getLocale()),
      });
    }
    this.drawWordsChart();
  }

  drawWordsChart() {
    const box = this.wordsChart;
    const months = this.wordsMonths;
    if (!box || !months) return;
    const width = box.clientWidth;
    const height = box.clientHeight;
    box.innerHTML = '';
    if (!width || !height) return;
    const locale = this.getLocale();
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs = {}, parent) => {
      const node = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
      if (parent) parent.appendChild(node);
      return node;
    };

    // A round top for the scale: 1, 2, 2.5 or 5 times a power of ten per step, four steps
    const max = Math.max(...months.map((m) => m.words));
    const rough = Math.max(max, 1) / 4;
    const power = 10 ** Math.floor(Math.log10(rough));
    const step = Math.max(
      25,
      [1, 2, 2.5, 5, 10].map((f) => f * power).find((v) => v >= rough)
    );
    const top = step * 4;

    const pad = { left: 40, right: 12, top: 26, bottom: 24 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const band = plotW / months.length;
    const x = (i) => pad.left + band * (i + 0.5);
    const y = (v) => pad.top + plotH - (v / top) * plotH;
    const short = (n) =>
      n.toLocaleString(locale, { notation: n >= 10000 ? 'compact' : 'standard' });

    const svg = el('svg', { class: 'area-svg', width, height, viewBox: `0 0 ${width} ${height}` });
    const defs = el('defs', {}, svg);
    const gradient = el('linearGradient', { id: 'wordsArea', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, class: 'area-stop', 'stop-opacity': 0.32 }, gradient);
    el('stop', { offset: 1, class: 'area-stop', 'stop-opacity': 0 }, gradient);

    // The grid, its values on the left
    for (let i = 0; i <= 4; i++) {
      const gy = y(step * i);
      el(
        'line',
        {
          class: i ? 'area-grid' : 'area-base',
          x1: pad.left,
          x2: width - pad.right,
          y1: gy,
          y2: gy,
        },
        svg
      );
      const label = el(
        'text',
        { class: 'area-axis', x: pad.left - 8, y: gy + 4, 'text-anchor': 'end' },
        svg
      );
      label.textContent = short(step * i);
    }

    // The line: a monotone curve through the months (never dips below zero), and the fill under it
    const pts = months.map((m, i) => [x(i), y(m.words)]);
    const n = pts.length;
    const slopes = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / (p[0] - pts[i][0]));
    const tangents = pts.map((_, i) => {
      if (i === 0) return slopes[0];
      if (i === n - 1) return slopes[n - 2];
      return slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
    });
    for (let i = 0; i < n - 1; i++) {
      if (slopes[i] === 0) {
        tangents[i] = 0;
        tangents[i + 1] = 0;
        continue;
      }
      const a = tangents[i] / slopes[i];
      const b = tangents[i + 1] / slopes[i];
      const h = a * a + b * b;
      if (h > 9) {
        const t = 3 / Math.sqrt(h);
        tangents[i] = t * a * slopes[i];
        tangents[i + 1] = t * b * slopes[i];
      }
    }
    let line = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < n - 1; i++) {
      const dx = (pts[i + 1][0] - pts[i][0]) / 3;
      line += ` C${pts[i][0] + dx},${pts[i][1] + tangents[i] * dx} ${pts[i + 1][0] - dx},${pts[i + 1][1] - tangents[i + 1] * dx} ${pts[i + 1][0]},${pts[i + 1][1]}`;
    }
    const base = y(0);
    el(
      'path',
      { class: 'area-fill', d: `${line} L${pts[n - 1][0]},${base} L${pts[0][0]},${base} Z` },
      svg
    );
    el('path', { class: 'area-line', d: line }, svg);

    // The months below, a point on each month with words, the current one filled
    months.forEach((m, i) => {
      const current = i === n - 1;
      const name = new Date(m.year, m.month, 1).toLocaleDateString(locale, { month: 'short' });
      const label = el(
        'text',
        {
          class: `area-month${current ? ' is-current' : ''}`,
          x: x(i),
          y: height - 6,
          'text-anchor': 'middle',
        },
        svg
      );
      label.textContent = name;
      if (m.words || current) {
        el(
          'circle',
          {
            class: `area-point${current ? ' is-current' : ''}`,
            cx: x(i),
            cy: y(m.words),
            r: current ? 5 : 3.5,
          },
          svg
        );
      }
    });

    // Hover: a guide line, the month's point and a tip with its words
    const guide = el('line', { class: 'area-guide', y1: pad.top, y2: base }, svg);
    const focus = el('circle', { class: 'area-focus', r: 5 }, svg);
    const tip = document.createElement('div');
    tip.className = 'area-tip';
    const hide = () => {
      guide.style.opacity = 0;
      focus.style.opacity = 0;
      tip.style.opacity = 0;
    };
    hide();
    months.forEach((m, i) => {
      const hit = el(
        'rect',
        { class: 'area-hit', x: pad.left + band * i, y: 0, width: band, height },
        svg
      );
      hit.dataset.month = `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
      hit.dataset.words = m.words;
      hit.addEventListener('mouseenter', () => {
        guide.setAttribute('x1', x(i));
        guide.setAttribute('x2', x(i));
        focus.setAttribute('cx', x(i));
        focus.setAttribute('cy', y(m.words));
        tip.innerHTML = '<strong></strong><span></span>';
        tip.firstChild.textContent = new Date(m.year, m.month, 1).toLocaleDateString(locale, {
          month: 'long',
          year: 'numeric',
        });
        tip.lastChild.textContent = `${m.words.toLocaleString(locale)} ${i18n.t('dashboard.words')}`;
        tip.style.left = `${Math.min(Math.max(x(i), 60), width - 60)}px`;
        // Above the point, or below it when the point is near the top
        const below = y(m.words) < 64;
        tip.classList.toggle('is-below', below);
        tip.style.top = `${below ? y(m.words) + 12 : y(m.words) - 12}px`;
        guide.style.opacity = 1;
        focus.style.opacity = 1;
        tip.style.opacity = 1;
      });
    });
    svg.addEventListener('mouseleave', hide);
    box.append(svg, tip);
  }

  setupDashboard() {
    // The words chart is drawn for its size, again when the card changes size
    if (this.wordsChart && typeof ResizeObserver === 'function') {
      new ResizeObserver(() => this.drawWordsChart()).observe(this.wordsChart);
    }
    this.calendarPrevBtn?.addEventListener('click', () => this.moveCalendar(-1));
    this.calendarNextBtn?.addEventListener('click', () => this.moveCalendar(1));
    this.calendarTodayBtn?.addEventListener('click', () => this.moveCalendar(0));
  }
}
