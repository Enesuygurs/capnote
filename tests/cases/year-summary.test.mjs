// The year in review counts a year's notes, words and writing days, finds the month written most,
// the most frequent mood, the longest streak within the year, the most used tags and the longest
// note, shows a heat map of the year's days, and saves the card as a PNG
export async function run() {
  const a = window.app;
  a.dashboardToday = '2026-11-04T12:00:00';
  const mk = (day, title, words, mood, tags) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = `<p>${'word '.repeat(words)}</p>`;
    a.selectedMood = mood;
    a.tags = tags;
    a.saveNote();
    a.currentNote.createdAt = `${day}T10:00:00`;
    a.currentNote.history = [{ type: 'created', ts: `${day}T10:00:00` }];
  };
  mk('2026-03-03', 'A', 10, 'happy', ['work']);
  mk('2026-03-04', 'B', 10, 'happy', ['work', 'home']);
  mk('2026-03-05', 'C', 10, 'tired', ['work']);
  mk('2026-07-01', 'Long one', 200, 'happy', []);
  mk('2025-12-31', 'Last year', 50, 'sad', ['old']);
  const s = a.yearSummary(2026);
  const r = {
    notes: s.notes,
    words: s.words,
    days: s.days,
    topMonth: [s.topMonth.month, s.topMonth.notes],
    mood: [s.topMood.key, s.topMood.share],
    streak: s.streak.length,
    tags: s.tags.map((t) => [t.name, t.count]),
    longest: s.longest.title,
    years: a.summaryYears(),
  };
  a.showYearSummary(2026);
  r.title = a.summaryTitle.textContent;
  r.nextDisabled = a.summaryNextBtn.disabled;
  // The heat map: a square per day of the year, the busiest day in the full accent
  const heat = (key) =>
    a.summaryCard.querySelector(`.heatmap-grid [data-day="${key}"]`)?.dataset.level;
  r.heatmap = {
    days: a.summaryCard.querySelectorAll('.heatmap-grid .heatmap-day:not(.is-outside)').length,
    busiest: heat('2026-07-01'),
    light: heat('2026-03-03'),
    none: heat('2026-03-06'),
    lastYearLeftOut: !heat('2025-12-31'),
  };
  a.summaryPrevBtn.click();
  r.prevYear = a.summaryTitle.textContent;
  await a.saveYearSummaryImage();
  r.headerBack = !a.summaryScreen.classList.contains('is-capturing');
  return r;
}

export const checkFiles = (files) => ({
  png: Object.keys(files).filter((f) => f.endsWith('.png')),
});

export const expected = {
  notes: 4,
  words: 230,
  days: 4,
  topMonth: [2, 3],
  mood: ['happy', 75],
  streak: 3,
  tags: [
    ['work', 3],
    ['home', 1],
  ],
  longest: 'Long one',
  years: [2026, 2025],
  title: '2026 özeti',
  nextDisabled: true,
  heatmap: { days: 365, busiest: '4', light: '1', none: '0', lastYearLeftOut: true },
  prevYear: '2025 özeti',
  headerBack: true,
};

export const expectedFiles = { png: ['capnote-2025.png'] };
