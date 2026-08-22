// Words are counted in any script; folder drags are told apart from note drags

export async function run() {
  const a = window.app;
  const html = a.countWordsAndCharsFromHtml(
    '<p>Merhaba&nbsp;dünya</p><p>123, İzmir! çok-güzel</p>'
  );
  a.createNewNote();
  a.richEditor.innerHTML = '<p>Bir iki</p><div>üç&nbsp;dört</div>';
  a.updateWordCount();
  const dt1 = new DataTransfer();
  dt1.setData('text/folder-id', 'f1');
  const dt2 = new DataTransfer();
  dt2.setData('text/plain', 'note');
  // Folder reorder: create two folders, drop the second near the top edge of the first
  a.createFolder?.('Alpha');
  a.createFolder?.('Beta');
  return {
    html,
    editorWords: a.wordCount.textContent,
    editorChars: a.charCount.textContent,
    folderDrag: a.isDraggingFolder({ dataTransfer: dt1 }),
    noteDrag: a.isDraggingFolder({ dataTransfer: dt2 }),
    noTransfer: a.isDraggingFolder({}),
  };
}

export const expected = {
  html: {
    words: 6,
    chars: 37,
    text: 'Merhaba dünya  123, İzmir! çok-güzel ',
  },
  editorWords: '4 kelime',
  editorChars: '16 karakter',
  folderDrag: true,
  noteDrag: false,
  noTransfer: false,
};
