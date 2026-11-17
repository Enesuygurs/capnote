// A version compared with the note now: added lines and words in green, removed ones crossed
// out, a changed line word by word, the title change on top, long unchanged runs folded

export async function run() {
  const a = window.app;
  const r = {};
  const lines = (n) => Array.from({ length: n }, (_, i) => `<p>Satır ${i + 1}</p>`).join('');
  a.createNewNote();
  a.noteTitle.value = 'Plan';
  a.richEditor.innerHTML =
    '<h2>Hafta</h2><p>Pazartesi spor yap</p><p>Silinecek satır</p>' +
    lines(10) +
    '<div class="checklist">' +
    a.checklistItemHtml('Market') +
    '</div>';
  a.saveNote();
  const n = a.currentNote;
  await a.editCurrentNote();
  a.noteTitle.value = 'Haftalık plan';
  a.richEditor.innerHTML =
    '<h2>Hafta</h2><p>Pazartesi koşuya çık</p>' +
    lines(10) +
    '<p>Yeni satır</p><div class="checklist">' +
    a.checklistItemHtml('Market') +
    '</div>';
  a.richEditor.querySelector('input').checked = true;
  a.saveNote();

  // From the history list, straight to the comparison
  a.openNoteHistory();
  a.historyBody.querySelector('.history-compare').click();
  const box = a.viewerText.querySelector('.version-diff');
  const text = (sel) => [...box.querySelectorAll(sel)].map((e) => e.textContent.trim());
  r.shown = !!box;
  r.title = [text('.diff-title del')[0], text('.diff-title ins')[0]];
  r.changedWords = [
    text('.is-changed:not(.diff-title) del'),
    text('.is-changed:not(.diff-title) ins'),
  ];
  r.removed = text('.diff-row.is-removed');
  r.added = text('.diff-row.is-added');
  r.folded = text('.diff-fold');
  r.summary = a.versionDiffSummary.textContent;
  r.buttonOn = a.versionDiffBtn.classList.contains('active');

  // Off: the version as it was
  a.versionDiffBtn.click();
  r.offShowsVersion =
    !a.viewerText.querySelector('.version-diff') &&
    a.viewerText.textContent.includes('Silinecek satır');
  // On again, then the fold opens
  a.versionDiffBtn.click();
  a.viewerText.querySelector('.diff-fold').click();
  r.unfolded =
    !a.viewerText.querySelector('.diff-fold') && !a.viewerText.querySelector('.diff-row.hidden');
  a.endVersionPreview();
  r.noteUntouched = n.content.includes('koşuya');
  return r;
}

export const expected = {
  shown: true,
  title: ['Plan', 'Haftalık plan'],
  changedWords: [
    ['spor yap', '☐'],
    ['koşuya çık', '☑'],
  ],
  removed: ['Silinecek satır'],
  added: ['Yeni satır'],
  folded: ['4 değişmeyen satır'],
  summary: '3 ekleme, 3 silme',
  buttonOn: true,
  offShowsVersion: true,
  unfolded: true,
  noteUntouched: true,
};
