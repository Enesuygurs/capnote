// Search matches text (not markup), tags, mood and weather in both languages, and Turkish letters

export async function run() {
  const a = window.app;
  const mk = (title, html, extra = {}) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = html;
    Object.assign(a, { selectedMood: extra.mood || null, selectedWeather: extra.weather || null });
    a.saveNote(true);
  };
  mk('Groceries', '<div><span style="color:red">milk and eggs</span></div>');
  mk('Happy day', '<p>sunny walk</p>', { mood: 'happy', weather: 'sunny' });
  mk('İzmir trip', '<p>ılık hava</p>');
  const search = (q) => {
    a.searchInput.value = q;
    a.searchNotes();
    return [...a.notesList.querySelectorAll('.note-item-title')].map((e) => e.textContent).sort();
  };
  const r = {
    markup_div: search('div'),
    markup_style: search('color'),
    text: search('eggs'),
    oneLetter: search('s'),
    moodEnglish: search('happy'),
    moodTurkish: search('mutl'),
    weatherTurkish: search('güneş'),
    turkishI: search('izmir'),
    turkishDotless: search('ilik'),
  };
  search('');
  return r;
}

export const expected = {
  markup_div: [],
  markup_style: [],
  text: ['Groceries'],
  oneLetter: ['Groceries', 'Happy day'],
  moodEnglish: ['Happy day'],
  moodTurkish: ['Happy day'],
  weatherTurkish: ['Happy day'],
  turkishI: ['İzmir trip'],
  turkishDotless: [],
};
