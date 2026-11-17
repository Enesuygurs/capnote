// A new install starts in the system's language and opens on a welcome note (an ordinary note,
// with tasks to try); the next start keeps it and adds no other

export const firstRun = true;

// The first start: the welcome note is made
export async function seed() {
  const a = window.app;
  return { notes: a.notes.length };
}

export async function run() {
  const a = window.app;
  const note = a.notes[0];
  const stored = (await window.electronAPI.storage.load()).data;
  return {
    notes: a.notes.length,
    title:
      note.title ===
      (a.settings.language === 'tr' ? "Capnote'a hoş geldiniz" : 'Welcome to Capnote'),
    language: a.settings.language === a.systemLanguage(),
    storedLanguage: stored.settings.language === a.systemLanguage(),
    tasks: a.parseInertHtml(note.content).querySelectorAll('.checklist-item').length,
    tips: a.parseInertHtml(note.content).querySelectorAll('li').length,
  };
}

export const expected = {
  notes: 1,
  title: true,
  language: true,
  storedLanguage: true,
  tasks: 3,
  tips: 6,
};
