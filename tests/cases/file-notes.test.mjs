// File notes ("Edit with Capnote"): a file the main process sends becomes a note linked to it and
// opens in the editor as the file's plain text (no rich text toolbar), the counter counts it, a text
// file shows as it is and an HTML file as its page; the same file again updates that note instead of
// adding another, a file note cannot be locked, and its copy is a note of its own.
// Reading and writing the file itself is the main process's (src/main/files.js).
export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const file = (name, content) => ({
    ok: true,
    path: `C:\\Docs\\${name}`,
    name,
    ext: name.split('.').pop(),
    content,
    mtimeMs: 1000,
  });

  a.openExternalFile(file('plan.md', '# Plan\n\n- one\n- two\n'));
  await wait(150);
  const md = a.currentNote;
  const r = {
    opened: {
      title: md.title,
      kind: md.fileKind,
      editor: a.isEditorOpen(),
      text: a.markdownEditor.value,
      toolbarHidden: getComputedStyle(document.querySelector('.formatting-toolbar')).display,
      words: a.wordCount.textContent,
    },
  };

  // The same file again: the same note, with the file's new text
  a.cancelEdit();
  a.openExternalFile(file('plan.md', '# Plan\n\n- one\n'));
  await wait(150);
  r.again = {
    sameNote: a.currentNote === md,
    fileNotes: a.notes.filter((n) => n.filePath).length,
    text: md.content,
  };

  // A text file shows as it is; an HTML file as its page, without its head or scripts
  a.cancelEdit();
  a.openExternalFile(file('notes.txt', 'line one\n  indented\n\nlast'));
  await wait(150);
  a.cancelEdit();
  r.txt = {
    shown: a.viewerText.querySelector('.plain-text')?.textContent,
    chip: a.viewerFile.textContent.trim(),
    icon: a.notesList.querySelector('.note-item.active .nav-icon')?.className,
  };
  a.openExternalFile(
    file(
      'page.html',
      '<html><head><script>x()</script></head><body><h1>Hi</h1><p>A page</p></body></html>'
    )
  );
  await wait(150);
  a.cancelEdit();
  r.html = a.viewerText.innerHTML;

  // Not lockable; a copy is not linked to the file
  const htmlNote = a.currentNote;
  await a.toggleLock(htmlNote.id);
  r.locked = htmlNote.isLocked;
  a.duplicateNote(htmlNote);
  const copy = a.notes[0];
  r.copy = { linked: !!copy.filePath, kind: copy.fileKind || null };

  // A file that could not be read says so
  a.openExternalFile({ ok: false, error: 'too-large', path: 'C:\\Docs\\big.md' });
  r.tooLarge = document.querySelector('.notification')?.textContent.trim();
  return r;
}

export const expected = {
  opened: {
    title: 'plan',
    kind: 'md',
    editor: true,
    text: '# Plan\n\n- one\n- two\n',
    toolbarHidden: 'none',
    words: '3 kelime',
  },
  again: { sameNote: true, fileNotes: 1, text: '# Plan\n\n- one\n' },
  txt: { shown: 'line one\n  indented\n\nlast', chip: 'notes.txt', icon: /fa-file nav-icon/ },
  html: '<h1>Hi</h1><p>A page</p>',
  locked: false,
  copy: { linked: false, kind: null },
  tooLarge: /“big.md” çok büyük/,
};
