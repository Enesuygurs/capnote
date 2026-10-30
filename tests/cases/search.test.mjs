// Search matches text (not markup), tags, mood and weather in both languages, and Turkish letters;
// "#word" matches a tag starting with it or a "#word" in the text, together with the other words

export async function run() {
  const a = window.app;
  const mk = (title, html, extra = {}) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = html;
    Object.assign(a, { selectedMood: extra.mood || null, selectedWeather: extra.weather || null });
    a.tags = extra.tags || [];
    a.saveNote(true);
  };
  mk('Groceries', '<div><span style="color:red">milk and eggs</span></div>');
  mk('Happy day', '<p>sunny walk</p>', { mood: 'happy', weather: 'sunny' });
  mk('İzmir trip', '<p>ılık hava</p>');
  mk('Standup', '<p>daily sync</p>', { tags: ['Work', 'meeting'] });
  mk('Side project', '<p>ideas #work later</p>', { tags: ['ideas'] });
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
    hashtag: search('#work'),
    hashtagPrefix: search('#mee'),
    hashtagAndText: search('#work sync'),
    twoHashtags: search('#work #ideas'),
    noSuchTag: search('#nothing'),
    bareHash: search('#').length,
  };
  search('');
  return r;
}

export const expected = {
  markup_div: [],
  markup_style: [],
  text: ['Groceries'],
  oneLetter: ['Groceries', 'Happy day', 'Side project', 'Standup'],
  moodEnglish: ['Happy day'],
  moodTurkish: ['Happy day'],
  weatherTurkish: ['Happy day'],
  turkishI: ['İzmir trip'],
  turkishDotless: [],
  hashtag: ['Side project', 'Standup'],
  hashtagPrefix: ['Standup'],
  hashtagAndText: ['Standup'],
  twoHashtags: ['Side project'],
  noSuchTag: [],
  bareHash: 5,
};
