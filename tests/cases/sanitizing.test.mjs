// Scripts, event handlers and javascript: links in note content never run

export const allowedErrors = [/Content Security Policy/];

export async function run() {
  const a = window.app;
  window.__pwned = 0;
  const evil =
    '<p>hi</p><img src="x" onerror="window.__pwned++"><script>window.__pwned++</script><a href="javascript:window.__pwned++">l</a>' +
    '<div class="checklist"><div class="checklist-item"><input type="checkbox" id="c1" checked="checked"><label for="c1">task</label></div></div>' +
    '<span class="img-wrap" contenteditable="false"><img class="embedded-image" src="file:///C:/x.png"></span>';
  a.createNewNote();
  a.noteTitle.value = 'X';
  a.richEditor.innerHTML = '<p>placeholder</p>';
  a.saveNote(true);
  a.currentNote.content = evil;
  a.countWordsAndCharsFromHtml(evil);
  a.getPlainText(evil);
  a.selectNote(a.currentNote); // viewer render
  await a.editCurrentNote(); // editor render
  a.addTag("it's");
  a.tagsList.querySelector('.tag-remove').click();
  await new Promise((r) => setTimeout(r, 300));
  const html = a.generateHTMLExport({ ...a.currentNote, title: '<b>t</b>' });
  return {
    pwned: window.__pwned,
    checkboxKept: !!a.viewerText.querySelector('input[type=checkbox][checked]'),
    fileImgKept: a.viewerText.querySelector('img.embedded-image')?.getAttribute('src'),
    jsLinkHref: a.viewerText.querySelector('a')?.getAttribute('href') ?? null,
    tagRemoved: a.tags.length === 0,
    exportTitleEscaped: html.includes('&lt;b&gt;t&lt;/b&gt;'),
    folderColor: a.safeColor('red"><img src=x onerror=1>'),
  };
}

export const expected = {
  pwned: 0,
  checkboxKept: true,
  fileImgKept: 'file:///C:/x.png',
  jsLinkHref: null,
  tagRemoved: true,
  exportTitleEscaped: true,
  folderColor: '#3b82f6',
};
