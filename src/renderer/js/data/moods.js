// Mood and weather values a note can have. Notes store the key; the editor buttons in index.html
// carry the icon and the translated title for each key.

// English search words, so a search in either language finds the note
export const MOOD_KEYWORDS = {
  happy: ['happy', 'smile'],
  sad: ['sad', 'cry'],
  angry: ['angry'],
  tired: ['sleepy', 'tired'],
  inLove: ['love', 'heart'],
  thoughtful: ['thinking', 'think'],
  cool: ['cool', 'sunglasses'],
  bored: ['bored'],
};

export const WEATHER_KEYWORDS = {
  sunny: ['sun', 'sunny'],
  partlyCloudy: ['partly cloudy', 'partly'],
  cloudy: ['cloud', 'cloudy'],
  rainy: ['rain', 'rainy'],
  stormy: ['storm', 'thunderstorm'],
  snowy: ['snow', 'snowy'],
};

// Older versions stored the emoji itself
const LEGACY_MOODS = {
  '😊': 'happy',
  '😢': 'sad',
  '😡': 'angry',
  '😴': 'tired',
  '😍': 'inLove',
  '🤔': 'thoughtful',
  '😎': 'cool',
  '🙄': 'bored',
};

const LEGACY_WEATHER = {
  '☀': 'sunny',
  '⛅': 'partlyCloudy',
  '☁': 'cloudy',
  '🌧': 'rainy',
  '⛈': 'stormy',
  '❄': 'snowy',
};

// Emoji variation selectors are optional, so compare without them
const withoutVariation = (value) => String(value).replace(/️/g, '');

export function toMoodKey(value) {
  if (!value) return null;
  if (value in MOOD_KEYWORDS) return value;
  return LEGACY_MOODS[withoutVariation(value)] || null;
}

export function toWeatherKey(value) {
  if (!value) return null;
  if (value in WEATHER_KEYWORDS) return value;
  return LEGACY_WEATHER[withoutVariation(value)] || null;
}
