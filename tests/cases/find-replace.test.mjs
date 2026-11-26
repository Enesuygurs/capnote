// Find and replace in the open note: Ctrl+F finds in the note being read (count, highlights, next
// and previous, Turkish letters folded one for one), Ctrl+H shows the replace row (the note opens for editing when something is replaced) and
// replaces one match or all of them (one undo step each), a plain text note finds and replaces in
// its text, Escape closes the bar, and with no note open Ctrl+F still searches the notes.

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ctrl = (key, extra = {}) =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, ...extra })
    );
  const bar = () => document.querySelector('.find-bar');
  const count = () => bar().querySelector('.find-count').textContent;
  const r = {};

  // A note to read
  a.createNewNote();
  a.noteTitle.value = 'Bul';
  a.richEditor.innerHTML =
    '<p>İstanbul elma ve <b>Elma</b> armut.</p><p>Bir elma daha: elma</p><p>ISTANBUL değil</p>';
  a.saveNote(true);
  a.finishEditing();
  await wait(300);

  // Ctrl+F in the viewer
  ctrl('f');
  await wait(100);
  const f = a.find;
  r.opens = !bar().classList.contains('hidden') && document.activeElement === f.query;
  f.query.value = 'elma';
  f.query.dispatchEvent(new Event('input'));
  await wait(50);
  r.count = count();
  r.highlights = CSS.highlights.has('find-match') && CSS.highlights.has('find-current');
  f.query.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  r.next = count();
  f.query.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true })
  );
  f.query.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true })
  );
  r.prevWraps = count();
  // Match case
  bar().querySelector('[data-find="case"]').click();
  r.matchCase = count();
  bar().querySelector('[data-find="case"]').click();
  // A dotted capital İ is folded to i, one letter for one
  f.query.value = 'istanbul';
  f.query.dispatchEvent(new Event('input'));
  r.turkish = count();
  r.currentText =
    CSS.highlights.get('find-current') && [...CSS.highlights.get('find-current')][0].toString();
  // The viewer can replace too: the note opens for editing when a replacement is made
  r.viewerReplaceDisabled = bar().querySelector('[data-find="replace"]').disabled;

  // Ctrl+H: the replace row shows; the note stays as it is read until something is replaced
  ctrl('h');
  await wait(400);
  r.editing = !a.isEditorOpen() && !f.replaceRow.classList.contains('hidden');
  f.query.value = 'elma';
  f.query.dispatchEvent(new Event('input'));
  await wait(50);
  f.replacement.value = 'ARMUT';
  bar().querySelector('[data-find="replace"]').click();
  await wait(500);
  r.afterOne = { count: count(), text: a.richEditor.textContent };
  bar().querySelector('[data-find="replaceAll"]').click();
  await wait(50);
  r.afterAll = {
    count: count(),
    text: a.richEditor.textContent,
    bold: !!a.richEditor.querySelector('b'),
  };
  // Undo goes back one replacement at a time
  a.undoEditor?.();
  r.undoAll = (a.richEditor.textContent.match(/elma/gi) || []).length;

  // Escape closes the bar and clears the marks
  bar().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(50);
  r.closed = bar().classList.contains('hidden') && !CSS.highlights.has('find-match');
  a.finishEditing();
  await wait(200);

  // A plain text note (a file note): found as the text area's selection, replaced in its text
  a.openExternalFile({
    ok: true,
    path: 'C:\\Docs\\liste.txt',
    name: 'liste.txt',
    ext: 'txt',
    content: 'bir\niki\nbir daha\nüç',
    mtimeMs: 1,
  });
  await wait(300);
  ctrl('h');
  await wait(200);
  f.query.value = 'bir';
  f.query.dispatchEvent(new Event('input'));
  await wait(50);
  const ta = a.markdownEditor;
  r.plain = { count: count(), selected: ta.value.slice(ta.selectionStart, ta.selectionEnd) };
  f.replacement.value = 'BİR';
  bar().querySelector('[data-find="replaceAll"]').click();
  await wait(50);
  r.plain.after = ta.value;
  bar().querySelector('[data-find="close"]').click();
  a.finishEditing();
  await wait(200);

  // No note open: Ctrl+F searches the notes, as before
  a.showWelcome();
  await wait(200);
  ctrl('f');
  await wait(100);
  r.noNote = {
    findBar: !bar().classList.contains('hidden'),
    search: document.activeElement === a.searchInput,
  };
  return r;
}

export const expected = {
  opens: true,
  count: '1/4',
  highlights: true,
  next: '2/4',
  prevWraps: '4/4',
  matchCase: '1/3',
  // The four Turkish i's are one letter; while typing, the current match stays near the last one
  turkish: '2/2',
  currentText: 'ISTANBUL',
  viewerReplaceDisabled: false,
  editing: true,
  afterOne: {
    count: '1/3',
    text: 'İstanbul ARMUT ve Elma armut.Bir elma daha: elmaISTANBUL değil',
  },
  afterAll: {
    count: 'Sonuç yok',
    text: 'İstanbul ARMUT ve ARMUT armut.Bir ARMUT daha: ARMUTISTANBUL değil',
    bold: true,
  },
  undoAll: 3,
  closed: true,
  plain: { count: '1/2', selected: 'bir', after: 'BİR\niki\nBİR daha\nüç' },
  noNote: { findBar: false, search: true },
};
