// The mood journey on the overview: the last 7 or 30 days, each with its latest note's mood, and the
// weekdays where one mood is in most of the notes

const note = (id, iso, mood) => ({
  id,
  title: id,
  content: '<p>x</p>',
  mood,
  createdAt: iso,
  updatedAt: iso,
  tags: [],
});

export async function seed() {
  // Mondays tired (3 of 4), Fridays split evenly (no pattern), one Sunday (too few notes)
  await window.electronAPI.storage.save('notes', [
    note('mon1', '2026-10-12T09:00:00', 'tired'),
    note('mon2', '2026-10-19T09:00:00', 'tired'),
    note('mon3', '2026-10-26T09:00:00', 'happy'),
    note('mon4', '2026-11-02T09:00:00', 'tired'),
    note('fri1', '2026-10-16T09:00:00', 'happy'),
    note('fri2', '2026-10-23T09:00:00', 'sad'),
    note('fri3', '2026-10-30T09:00:00', 'happy'),
    note('fri4', '2026-10-09T09:00:00', 'sad'),
    note('sun', '2026-11-01T09:00:00', 'cool'),
    // The same day twice: the later note's mood counts for the day
    note('tue-a', '2026-11-03T08:00:00', 'sad'),
    note('tue-b', '2026-11-03T20:00:00', 'thoughtful'),
    note('none', '2026-10-31T09:00:00', null),
  ]);
  return 'seeded';
}

export async function run() {
  const a = window.app;
  a.dashboardToday = '2026-11-04T12:00:00';
  a.showWelcome();
  const cells = () =>
    [...a.moodStrip.querySelectorAll('.mood-day-mark')].map((m) => m.dataset.tone || '-');
  const week = cells();
  const weekLabels = [...a.moodStrip.querySelectorAll('.mood-day-label')].map((l) => l.textContent);
  const patterns = [...a.moodPatternsList.querySelectorAll('.mood-pattern')].map(
    (p) => p.textContent
  );
  a.moodJourneyRangeTabs.querySelector('[data-range="30"]').click();
  const month = {
    count: a.moodStrip.children.length,
    isMonth: a.moodStrip.classList.contains('is-month'),
    last: cells().slice(-3),
    active: a.moodJourneyRangeTabs.querySelector('.active').dataset.range,
  };
  return { week, weekLabels, patterns, month };
}

export const expected = {
  week: ['-', 'happy', '-', 'cool', 'tired', 'thoughtful', '-'],
  weekLabels: ['Per', 'Cum', 'Cmt', 'Paz', 'Pzt', 'Sal', 'Çar'],
  patterns: ['Pazartesileri genelde yorgun oluyorsun'],
  month: { count: 30, isMonth: true, last: ['tired', 'thoughtful', '-'], active: '30' },
};
