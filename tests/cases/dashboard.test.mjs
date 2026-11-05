// The overview on the home page: totals, the writing streak (writing yesterday keeps it going),
// the words of the last 30 days, a calendar with each day's mood whose days list their notes, how moods and
// weather are spread, and the words of the last twelve months

export async function run() {
  const a = window.app;
  a.dashboardToday = '2026-06-15T12:00:00';
  a.calendarDate = null;
  a.calendarSelectedDay = null;
  const make = (title, day, mood, words) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = `<p>${'word '.repeat(words)}</p>`;
    a.selectedMood = mood;
    a.selectedWeather = mood === 'happy' ? 'sunny' : null;
    a.saveNote(true);
    const note = a.currentNote;
    const at = new Date(`${day}T09:00:00`).toISOString();
    note.createdAt = at;
    note.updatedAt = at;
    note.history = [{ type: 'created', ts: at }];
    return note;
  };
  make('Today', '2026-06-15', 'happy', 10);
  make('Yesterday', '2026-06-14', 'sad', 20);
  make('Two days ago', '2026-06-13', 'happy', 30);
  make('Earlier', '2026-06-10', null, 40);
  make('Last month', '2026-05-20', 'tired', 100);
  a.showWelcome();

  const tile = (key) =>
    a.statTiles.querySelector(`[data-stat="${key}"] .stat-tile-value`).textContent;
  const day = (key) => a.calendarGrid.querySelector(`[data-day="${key}"]`);
  const result = {
    overviewShown: !a.dashboard.classList.contains('hidden'),
    tiles: {
      notes: tile('notes'),
      activeDays: tile('activeDays'),
      streak: tile('streak'),
      longest: tile('longestStreak'),
      wordsLast30Days: tile('wordsLast30Days'),
    },
    month: a.calendarTitle.textContent,
    todayMood: day('2026-06-15').querySelector('.calendar-day-mark')?.dataset.tone,
    plainDay: day('2026-06-10').querySelector('.calendar-day-mark')?.classList.contains('is-dot'),
    isToday: day('2026-06-15').classList.contains('is-today'),
    moods: [...a.moodChart.querySelectorAll('.bar-row')].map(
      (r) => r.querySelector('.bar-value').textContent
    ),
    weather: a.weatherChart.querySelectorAll('.bar-row').length,
    months: [...a.wordsChart.querySelectorAll('.area-hit')].map((h) => h.dataset.words),
    wordsTotal: a.wordsTotal.textContent,
  };

  // A day with notes lists them in the words card in place of the chart; choosing it again
  // brings the chart back; a click on a note opens it
  const chartShown = () => getComputedStyle(a.wordsChart).display !== 'none';
  day('2026-06-14').click();
  result.dayList = [...a.calendarDayList.querySelectorAll('.calendar-note-title')].map(
    (t) => t.textContent
  );
  result.dayInWordsCard = [a.wordsCard.contains(a.calendarDayNotes), chartShown()];
  // Mood and weather count the chosen day only, and their headers name it
  const moodRows = () =>
    [...a.moodChart.querySelectorAll('.bar-row')].map(
      (r) => r.querySelector('.bar-value').textContent
    );
  result.dayMoods = {
    rows: moodRows(),
    header: a.moodTotal.textContent,
    weather: a.weatherChart.textContent.trim(),
  };
  day('2026-06-14').click();
  result.chartBack = [chartShown(), a.calendarDayNotes.classList.contains('hidden')];
  result.allMoodsBack = moodRows().length;
  day('2026-06-14').click();
  // The previous month
  a.calendarPrevBtn.click();
  result.previousMonthMood = a.calendarGrid.querySelector(
    '[data-day="2026-05-20"] .calendar-day-mark'
  )?.dataset.tone;
  a.calendarTodayBtn.click();
  result.backToJune = a.calendarTitle.textContent;
  a.calendarGrid.querySelector('[data-day="2026-06-14"]').click();
  a.calendarGrid.querySelector('[data-day="2026-06-14"]').click();
  a.calendarDayList.querySelector('.calendar-note').click();
  result.opened = a.currentNote.title;

  // Not writing yesterday or today ends the streak
  a.dashboardToday = '2026-06-18T12:00:00';
  result.streakAfterBreak = a.writingStreaks().current;
  return result;
}

export const expected = {
  overviewShown: true,
  tiles: { notes: '5', activeDays: '5', streak: '3', longest: '3', wordsLast30Days: '200' },
  month: 'Haziran 2026',
  todayMood: 'happy',
  plainDay: true,
  isToday: true,
  moods: ['2 · 50%', '1 · 25%', '1 · 25%'],
  weather: 1,
  months: [...Array(10).fill('0'), '100', '100'],
  wordsTotal: '200 kelime, son 12 ay',
  dayList: ['Yesterday'],
  dayInWordsCard: [true, false],
  dayMoods: {
    rows: ['1 · 100%'],
    header: '14 Haziran · 1 not',
    weather: 'Bu gün için hava durumu seçilmemiş',
  },
  allMoodsBack: 3,
  chartBack: [true, true],
  previousMonthMood: 'tired',
  backToJune: 'Haziran 2026',
  opened: 'Yesterday',
  streakAfterBreak: 0,
};
