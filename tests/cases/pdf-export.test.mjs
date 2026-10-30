// Exporting a note to PDF writes the file

export const savePath = 'note.pdf';

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'PDF: test/one';
  a.richEditor.innerHTML =
    '<h2>Başlık ğüşıöç</h2><p>Some <b>bold</b> text</p><pre><code>const x = 1;</code></pre>';
  a.addTag('work');
  a.saveNote();
  const r = await window.electronAPI.exportPdf({
    title: a.currentNote.title,
    bodyHtml: a.buildExportBody(a.currentNote),
    fileName: 'x.pdf',
  });
  return r;
}

export const expected = {
  ok: true,
  filePath: /note\.pdf$/,
};
