// Mood and weather emoji from older versions become keys; viewer, search and export use the translated names

export async function seed() {
  const t = new Date().toISOString();
  await window.electronAPI.storage.save('notes', [
    {
      id: 'a',
      title: 'Legacy',
      content: '<p>x</p>',
      mood: '😍',
      weather: '☀️',
      createdAt: t,
      updatedAt: t,
      tags: [],
    },
    {
      id: 'b',
      title: 'No selector',
      content: '<p>y</p>',
      mood: '😴',
      weather: '☀',
      createdAt: t,
      updatedAt: t,
      tags: [],
    },
    {
      id: 'c',
      title: 'Unknown',
      content: '<p>z</p>',
      mood: '🦄',
      weather: 'sunny',
      createdAt: t,
      updatedAt: t,
      tags: [],
    },
  ]);
  return 'seeded';
}

export async function run() {
  const a = window.app;
  const byId = (id) => a.notes.find((n) => n.id === id);
  const stored = a.notes.map((n) => [n.title, n.mood, n.weather]);
  a.selectNote(byId('a'));
  const viewer = {
    mood: a.viewerMood.innerHTML,
    moodTitle: a.viewerMood.title,
    weather: a.viewerWeather.innerHTML,
  };
  const search = (q) => {
    a.searchInput.value = q;
    a.searchNotes();
    return [...a.notesList.querySelectorAll('.note-item-title')].map((e) => e.textContent).sort();
  };
  const searches = {
    love: search('love'),
    asik: search('aşık'),
    gunes: search('güneş'),
    sleepy: search('sleepy'),
  };
  search('');
  const exported = a.buildExportBody(byId('a')).match(/export-meta">[^<]*(Ruh|Hava)[^<]*/g);
  await a.editCurrentNote();
  a.moodBtns[0].querySelector('i').click();
  const clickOnIcon = a.selectedMood;
  return {
    stored,
    viewer,
    searches,
    exported,
    clickOnIcon,
    buttons: [...a.moodBtns].map((b) => b.title + ':' + b.dataset.mood).join(', '),
  };
}

export const expected = {
  stored: [
    ['Legacy', 'inLove', 'sunny'],
    ['No selector', 'tired', 'sunny'],
    ['Unknown', null, 'sunny'],
  ],
  viewer: {
    mood: '<i class="fas fa-face-grin-hearts" aria-hidden="true"></i>',
    moodTitle: 'Aşık',
    weather: '<i class="fas fa-sun" aria-hidden="true"></i>',
  },
  searches: {
    love: ['Legacy'],
    asik: ['Legacy'],
    gunes: ['Legacy', 'No selector', 'Unknown'],
    sleepy: ['No selector'],
  },
  exported: ['export-meta">Ruh Hali: Aşık', 'export-meta">Hava Durumu: Güneşli'],
  clickOnIcon: 'happy',
  buttons:
    'Mutlu:happy, Üzgün:sad, Kızgın:angry, Yorgun:tired, Aşık:inLove, Düşünceli:thoughtful, Havalı:cool, Sıkılmış:bored',
};
