// A new note can start from a template (journal, meeting notes, weekly plan) chosen beside the
// new note button; the text follows the app's language and the note saves like any other

export async function run() {
  const a = window.app;
  const r = {};
  a.newNoteTemplatesBtn.click();
  r.menu = [...a.templateMenu.querySelectorAll('.menu-item span')].map((s) => s.textContent.trim());
  r.menuOpen = !a.templateMenu.classList.contains('hidden');

  a.templateMenu.querySelector('[data-template="journal"]').click();
  r.menuClosed = a.templateMenu.classList.contains('hidden');
  r.editorOpen = a.isEditorOpen();
  r.journalTitle = a.noteTitle.value.startsWith('Günlük · ');
  r.journal = [...a.richEditor.querySelectorAll('h2, h3')].map((h) => h.textContent);
  r.journalParts = {
    numbered: a.richEditor.querySelectorAll('ol li').length,
    tasks: a.richEditor.querySelectorAll('.checklist-item').length,
  };
  a.saveNote(true);
  r.saved = a.notes.some((n) => n.title.startsWith('Günlük · ') && n.content.includes('<h2>'));

  a.createNoteFromTemplate('weekly');
  r.weeklyHeadings = a.richEditor.querySelectorAll('h3').length;
  r.weeklyFirstDay = a.richEditor.querySelectorAll('h3')[1].textContent;
  r.weeklyGoals = a.richEditor
    .querySelector('.checklist')
    .querySelectorAll('.checklist-item').length;
  a.cancelEdit();

  a.createNoteFromTemplate('meeting');
  r.meeting = [...a.richEditor.querySelectorAll('h3')].map((h) => h.textContent);
  a.cancelEdit();

  // Blank is a normal new note
  a.newNoteTemplatesBtn.click();
  a.templateMenu.querySelector('[data-template="blank"]').click();
  r.blank = a.richEditor.innerHTML === '' && a.noteTitle.value === '';
  a.cancelEdit();

  // In English
  a.languageSelect.value = 'en';
  a.languageSelect.dispatchEvent(new Event('change'));
  await new Promise((done) => setTimeout(done, 200));
  a.createNoteFromTemplate('journal');
  r.english = a.richEditor.querySelector('h2').textContent;
  a.cancelEdit();
  return r;
}

export const expected = {
  menu: ['Boş not', 'Günlük', 'Toplantı notu', 'Haftalık plan'],
  menuOpen: true,
  menuClosed: true,
  editorOpen: true,
  journalTitle: true,
  journal: ['Bugün nasıldı?', 'Minnettar olduğum üç şey', 'Yarın için'],
  journalParts: { numbered: 3, tasks: 1 },
  saved: true,
  weeklyHeadings: 9,
  weeklyFirstDay: 'Pazartesi',
  weeklyGoals: 3,
  meeting: ['Katılımcılar', 'Gündem', 'Notlar', 'Kararlar', 'Yapılacaklar'],
  blank: true,
  english: 'How was today?',
};
