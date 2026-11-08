// A file note is its file, not a full note: in the editor it has no toolbar, no sidebar and no
// focus mode, and of the view buttons only the Markdown preview, for a Markdown file; it cannot be
// copied, archived, exported, locked or looked back through its history, and none of those show.
// Its viewer has a "File path" button. Titles keep the extension, also for file notes made before
// (unless the title was changed); deleting one offers to delete the file too. Dragging files over
// the notes list shows where they open.

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shown = (el) => !!el && getComputedStyle(el).display !== 'none';
  const lit = (el) => el.classList.contains('active');
  const byId = (id) => document.getElementById(id);
  const editorButtons = () => ({
    md: shown(a.toggleMarkdownBtn),
    sidebarBtn: shown(byId('toggleSidebar')),
    focus: shown(byId('focusModeBtn')),
    sidebar: shown(a.editorSidebar),
    toolbar: shown(document.querySelector('.formatting-toolbar')),
  });
  const viewerButtons = () =>
    Object.fromEntries(
      ['duplicateNoteBtn', 'historyBtn', 'exportNoteBtn', 'archiveViewBtn'].map((id) => [
        id,
        shown(byId(id)),
      ])
    );
  const menuItems = (note) => {
    a.showNoteContextMenu(100, 100, note.id);
    const items = Object.fromEntries(
      ['lock', 'duplicate', 'archive', 'rename', 'delete'].map((action) => [
        action,
        shown(a.noteContextMenu.querySelector(`[data-action="${action}"]`)),
      ])
    );
    a.hideNoteContextMenu();
    return items;
  };
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
  const sidebarSetting = a.settings.editorSidebarVisible;

  // An HTML file: only its text, no buttons, no sidebar (not even when asked for)
  await open('index.html', '<!doctype html><html><body><h1>Hi</h1></body></html>');
  const htmlNote = a.currentNote;
  r.title = htmlNote.title;
  r.html = editorButtons();
  a.toggleEditorSidebar();
  r.sidebarAsked = { shown: shown(a.editorSidebar), settingKept: a.settings.editorSidebarVisible };
  a.cancelEdit();

  // A Markdown file: the Markdown preview, lit only while it is open
  await open('plan.md', '# Plan');
  const mdNote = a.currentNote;
  r.md = editorButtons();
  a.toggleMarkdownBtn.click();
  r.mdOn = {
    lit: lit(a.toggleMarkdownBtn),
    preview: !a.markdownPreview.classList.contains('hidden'),
  };
  a.toggleMarkdownBtn.click();
  r.mdOff = {
    lit: lit(a.toggleMarkdownBtn),
    editor: !a.markdownEditor.classList.contains('hidden'),
  };
  a.saveNote(true);
  r.noHistory = mdNote.history.map((h) => h.type);
  a.cancelEdit();
  await open('list.txt', 'a\nb');
  r.txt = editorButtons();
  a.cancelEdit();

  // An ordinary note keeps all of it
  a.createNewNote();
  r.plain = editorButtons();
  a.noteTitle.value = 'Plain';
  a.richEditor.innerHTML = '<p>text</p>';
  a.saveNote(true);
  const plain = a.currentNote;
  // Esc keeps a new note that has something in it (Cancel would delete it)
  a.escapeEditor();

  // The viewer: no copy, history, export or archive for a file note; a "File path" button
  a.selectNote(htmlNote);
  await wait(100);
  r.viewer = {
    file: viewerButtons(),
    chip: a.viewerFile.textContent.trim(),
    chipTitle: a.viewerFile.title.split('\n')[0],
  };
  a.selectNote(plain);
  await wait(100);
  r.viewer.plain = viewerButtons();
  r.viewer.plainChip = shown(a.viewerFile);
  r.menu = { file: menuItems(htmlNote), plain: menuItems(plain) };

  // Nor can it be done another way (shortcuts, the selection)
  const count = a.notes.length;
  a.duplicateNote(htmlNote);
  a.duplicateNotes([htmlNote, mdNote]);
  await a.setArchived([htmlNote], true);
  a.selectNote(htmlNote);
  await wait(100);
  a.showExportModal();
  a.openNoteHistory();
  r.refused = {
    copies: a.notes.length - count,
    archived: !!htmlNote.isArchived,
    exportOpen: !a.exportModal.classList.contains('hidden'),
    historyOpen: [...document.querySelectorAll('.modal:not(.hidden)')].length,
  };

  // Earlier file notes get their extension; a title the user changed stays
  const old = { ...mdNote, id: a.newId(), title: 'old', filePath: 'C:\\Docs\\old.md' };
  const renamed = { ...mdNote, id: a.newId(), title: 'My notes', filePath: 'C:\\Docs\\mine.md' };
  r.migrate = [
    a.addExtensionToTitle(old),
    old.title,
    a.addExtensionToTitle(renamed),
    renamed.title,
  ];

  // Files dragged over the notes list: it shows they open there
  const dt = new DataTransfer();
  dt.items.add(new File(['x'], 'drop.md'));
  a.sidebarContent.dispatchEvent(
    new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true })
  );
  const list = byId('notesListContainer');
  r.dragOver = { marked: list.classList.contains('drag-over'), label: list.dataset.dropLabel };
  list.classList.remove('drag-over');

  // Deleting: a file note offers its file (unticked); an ordinary note does not
  const option = () => {
    const row = a.confirmModal.querySelector('.confirm-option');
    return row.classList.contains('hidden')
      ? null
      : { label: row.textContent.trim(), ticked: row.querySelector('input').checked };
  };
  await a.deleteNoteById(htmlNote.id);
  r.deleteFileNote = option();
  a.hideModal(a.confirmModal);
  await a.deleteNoteById(plain.id);
  r.deletePlainNote = option();
  a.hideModal(a.confirmModal);
  r.sidebarSetting = sidebarSetting;
  return r;
}

const noButtons = { md: false, sidebarBtn: false, focus: false, sidebar: false, toolbar: false };

export const expected = {
  title: 'index.html',
  html: noButtons,
  sidebarAsked: { shown: false, settingKept: true },
  md: { ...noButtons, md: true },
  mdOn: { lit: true, preview: true },
  mdOff: { lit: false, editor: true },
  noHistory: ['created'],
  txt: noButtons,
  // An ordinary note formats Markdown as it is typed: no preview button
  plain: { md: false, sidebarBtn: true, focus: true, sidebar: true, toolbar: true },
  viewer: {
    file: {
      duplicateNoteBtn: false,
      historyBtn: false,
      exportNoteBtn: false,
      archiveViewBtn: false,
    },
    chip: 'Dosya Yolu',
    chipTitle: 'C:\\Docs\\index.html',
    plain: { duplicateNoteBtn: true, historyBtn: true, exportNoteBtn: true, archiveViewBtn: true },
    plainChip: false,
  },
  menu: {
    file: { lock: false, duplicate: false, archive: false, rename: true, delete: true },
    plain: { lock: true, duplicate: true, archive: true, rename: true, delete: true },
  },
  refused: { copies: 0, archived: false, exportOpen: false, historyOpen: 0 },
  migrate: [true, 'old.md', false, 'My notes'],
  dragOver: { marked: true, label: 'Not olarak aç' },
  deleteFileNote: {
    label: 'Dosyayı da sil',
    ticked: false,
  },
  deletePlainNote: null,
  sidebarSetting: true,
};
