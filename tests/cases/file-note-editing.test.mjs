// Editing file notes: the editor has no sidebar until it is opened (the setting for notes stays),
// only the file kind's own preview button shows, the preview buttons are lit only while their
// preview is open, and an HTML file's page shows in the preview whichever preview came before.
// Titles keep the extension, also for file notes made before (unless the title was changed), and
// deleting a file note offers to delete the file too (an ordinary note does not).

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shown = (el) => getComputedStyle(el).display !== 'none';
  const lit = (el) => el.classList.contains('active');
  const page =
    '<!doctype html><html><head><title>T</title></head><body><h1>Hello page</h1></body></html>';
  const open = async (name, content) => {
    a.openExternalFile({
      ok: true,
      path: `C:\\Docs\\${name}`,
      name,
      ext: name.split('.').pop(),
      content,
      mtimeMs: 1,
    });
    await wait(150);
  };
  const r = {};

  // The sidebar: closed for a file note; opened there, it does not change the setting
  const sidebarSetting = a.settings.editorSidebarVisible;
  await open('index.html', page);
  r.title = a.currentNote.title;
  r.sidebar = { start: shown(a.editorSidebar) };
  a.toggleEditorSidebar();
  r.sidebar.toggled = shown(a.editorSidebar);
  r.sidebar.settingKept = a.settings.editorSidebarVisible === sidebarSetting;

  // Buttons for an HTML file: only the page preview
  r.htmlButtons = { md: shown(a.toggleMarkdownBtn), html: shown(a.toggleHtmlBtn) };
  // Lit only while open; the page shows even after the Markdown preview covered the editor
  a.toggleMarkdownBtn.click();
  r.mdOn = lit(a.toggleMarkdownBtn);
  a.toggleMarkdownBtn.click();
  r.mdOff = lit(a.toggleMarkdownBtn);
  a.toggleMarkdownBtn.click();
  a.toggleHtmlBtn.click();
  const frame = a.htmlPreview.querySelector('iframe');
  r.page = { lit: lit(a.toggleHtmlBtn), mdLit: lit(a.toggleMarkdownBtn), srcdoc: frame.srcdoc };
  a.toggleHtmlBtn.click();
  a.toggleHtmlBtn.click();
  r.pageAgain = frame.srcdoc === page && !a.htmlPreview.classList.contains('hidden');
  a.toggleHtmlBtn.click();
  r.editorBack = !a.markdownEditor.classList.contains('hidden');
  a.cancelEdit();

  // The other kinds' buttons; an ordinary note has both and its sidebar as set
  await open('plan.md', '# Plan');
  r.mdButtons = { md: shown(a.toggleMarkdownBtn), html: shown(a.toggleHtmlBtn) };
  r.mdSidebar = shown(a.editorSidebar);
  a.cancelEdit();
  await open('list.txt', 'a\nb');
  r.txtButtons = { md: shown(a.toggleMarkdownBtn), html: shown(a.toggleHtmlBtn) };
  a.cancelEdit();
  a.createNewNote();
  r.plainNote = {
    md: shown(a.toggleMarkdownBtn),
    html: shown(a.toggleHtmlBtn),
    sidebar: shown(a.editorSidebar) === sidebarSetting,
  };
  a.noteTitle.value = 'Plain';
  a.saveNote(true);
  const plain = a.currentNote;

  // Earlier file notes get their extension; a title the user changed stays
  const old = { ...a.notes.find((n) => n.title === 'list.txt'), id: a.newId(), title: 'old' };
  old.filePath = 'C:\\Docs\\old.md';
  const renamed = { ...old, id: a.newId(), title: 'My notes', filePath: 'C:\\Docs\\mine.md' };
  r.migrate = [
    a.addExtensionToTitle(old),
    old.title,
    a.addExtensionToTitle(renamed),
    renamed.title,
  ];

  // Deleting: a file note offers its file (unticked); an ordinary note does not
  const option = () => {
    const row = a.confirmModal.querySelector('.confirm-option');
    return row.classList.contains('hidden')
      ? null
      : { label: row.textContent.trim(), ticked: row.querySelector('input').checked };
  };
  const htmlNote = a.notes.find((n) => n.title === 'index.html');
  await a.deleteNoteById(htmlNote.id);
  r.deleteFileNote = option();
  a.hideModal(a.confirmModal);
  await a.deleteNoteById(plain.id);
  r.deletePlainNote = option();
  a.hideModal(a.confirmModal);
  // Ticked: the note goes and the file is asked to go too (this file is not one Capnote opened,
  // so the main process refuses and the note says so)
  await a.deleteNoteById(htmlNote.id);
  a.confirmModal.querySelector('#confirmOptionCheck').checked = true;
  document.getElementById('confirmBtn').click();
  await wait(200);
  r.deleted = {
    gone: !a.notes.includes(htmlNote),
    toast: document.querySelector('.notification')?.textContent.trim(),
  };
  return r;
}

export const expected = {
  title: 'index.html',
  sidebar: { start: false, toggled: true, settingKept: true },
  htmlButtons: { md: false, html: true },
  mdOn: true,
  mdOff: false,
  page: {
    lit: true,
    mdLit: false,
    srcdoc:
      '<!doctype html><html><head><title>T</title></head><body><h1>Hello page</h1></body></html>',
  },
  pageAgain: true,
  editorBack: true,
  mdButtons: { md: true, html: false },
  mdSidebar: false,
  txtButtons: { md: false, html: false },
  plainNote: { md: true, html: true, sidebar: true },
  migrate: [true, 'old.md', false, 'My notes'],
  deleteFileNote: {
    label: /^“index\.html” dosyasını da sil \(Geri Dönüşüm Kutusu.na taşınır\)$/,
    ticked: false,
  },
  deletePlainNote: null,
  deleted: { gone: true, toast: /“index.html” silinemedi/ },
};
