// A note saved as a template: its tasks start unticked, a note made from it gets fresh task ids
// and the note's tags; the same name replaces it; a locked note cannot be one; templates are in
// backups and can be deleted. The book template fills a new note too.

export async function run() {
  const a = window.app;
  const r = {};
  a.createNewNote();
  a.noteTitle.value = 'Haftalık rapor';
  a.richEditor.innerHTML =
    '<h3>Bitenler</h3><div class="checklist">' + a.checklistItemHtml('Rapor') + '</div><p>Not</p>';
  a.richEditor.querySelector('input').checked = true;
  a.tags = ['iş'];
  a.saveNote(true);
  const note = a.currentNote;
  r.sourceTicked = note.content.includes('checked');

  await a.saveNoteAsTemplate(note);
  const stored = (await window.electronAPI.storage.load()).data.templates;
  r.stored = stored.length;
  r.storedUnticked = !stored[0].content.includes('checked');

  // The same name again replaces it
  await a.saveNoteAsTemplate(note);
  r.stillOne = a.userTemplates.length;

  // A locked note: the menu item is disabled
  a.notes.push({ ...note, id: 'L', isLocked: true, encrypted: 'x', content: '' });
  a.showNoteContextMenu(10, 10, 'L');
  r.lockedDisabled = a.noteContextMenu.querySelector('[data-action="saveTemplate"]').disabled;
  a.hideNoteContextMenu();
  a.notes = a.notes.filter((n) => n.id !== 'L');

  // The menu lists it; a note made from it
  a.showTemplateMenu();
  r.listed = [...document.querySelectorAll('#userTemplatesList .user-template span')].map(
    (s) => s.textContent
  );
  a.templateMenu.classList.add('hidden');
  const sourceId = note.content.match(/id="([^"]+)"/)[1];
  a.createNoteFromUserTemplate(a.userTemplates[0].id);
  r.newTitle = a.noteTitle.value;
  r.newHeading = a.richEditor.querySelector('h3')?.textContent;
  const box = a.richEditor.querySelector('.checklist-item input');
  r.newUnticked = !box.checked;
  r.newId = box.id !== sourceId && a.richEditor.querySelector('label').htmlFor === box.id;
  r.newTags = [...a.tags];

  // In the backup
  r.inBackup = (await a.buildBackupData()).templates.length;

  // Deleted
  await a.removeUserTemplate(a.userTemplates[0].id);
  r.afterRemove = (await window.electronAPI.storage.load()).data.templates.length;

  // The book template
  a.createNoteFromTemplate('book');
  r.book = a.richEditor.querySelectorAll('h3').length;
  return r;
}

export const expected = {
  sourceTicked: true,
  stored: 1,
  storedUnticked: true,
  stillOne: 1,
  lockedDisabled: true,
  listed: ['Haftalık rapor'],
  newTitle: 'Haftalık rapor',
  newHeading: 'Bitenler',
  newUnticked: true,
  newId: true,
  newTags: ['iş'],
  inBackup: 1,
  afterRemove: 0,
  book: 5,
};
