// Every export, started from its button: a note as text, HTML, JSON and PDF, and the full backup
// from the settings. Each file is written where the save dialog says, with the right content,
// and the app only reports success once the file is there.

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const toasts = [];
  const watch = new MutationObserver(() => toasts.push(a.notificationText.textContent));
  watch.observe(a.notificationText, { childList: true, characterData: true, subtree: true });

  a.createNewNote();
  a.noteTitle.value = 'Plan: A/B';
  a.richEditor.innerHTML =
    '<h2>Başlık ğüşıöç</h2><p>Some <b>bold</b> text</p>' +
    '<div class="checklist"><div class="checklist-item"><input type="checkbox" id="x1" checked="checked"><label for="x1" style="text-align: center;">Done task</label></div></div>' +
    '<ul><li>Item</li></ul><pre><code>const x = 1;</code></pre>' +
    '<table><tbody><tr><td>cell</td><td>two</td></tr></tbody></table><ol><li>first</li><li>second</li></ol>';
  a.addTag('work');
  a.saveNote(true);
  a.selectNote(a.currentNote);

  // Note exports from the export dialog
  for (const type of ['txt', 'html', 'json', 'pdf']) {
    a.showExportModal();
    await wait(50);
    a.exportModal.querySelector(`.export-btn[data-type="${type}"]`).click();
    await wait(type === 'pdf' ? 2500 : 300);
  }
  const modalClosed = a.exportModal.classList.contains('hidden');

  // A locked note cannot be exported
  const locked = { ...a.currentNote, id: 'locked', isLocked: true };
  a.notes.push(locked);
  a.currentNote = locked;
  a.showExportModal();
  const lockedOpens = !a.exportModal.classList.contains('hidden');
  a.hideAllModals();
  a.notes.pop();

  // Full backup from the settings
  a.showSettingsModal();
  document.getElementById('exportAllDataBtn').click();
  await wait(500);
  a.hideAllModals();

  watch.disconnect();

  // Cancelling the save dialog says nothing; a failed save says so
  a.hideNotification();
  a.reportSave({ ok: false, canceled: true }, 'messages.noteExported');
  const afterCancel = a.notification.classList.contains('hidden');
  a.reportSave({ ok: false, error: 'disk full' }, 'messages.noteExported');
  const afterFailure = a.notificationText.textContent;

  return {
    toasts: [...new Set(toasts)].filter(Boolean),
    modalClosed,
    lockedOpens,
    afterCancel,
    afterFailure,
  };
}

export const expected = {
  toasts: ['Not dışa aktarıldı!', 'PDF oluşturuldu', 'Veriler dışa aktarıldı'],
  modalClosed: true,
  lockedOpens: false,
  afterCancel: true,
  afterFailure: 'Dışa aktarma başarısız oldu',
};

export function checkFiles(files) {
  const names = Object.keys(files).sort();
  const text = (name) => files[name]?.toString('utf8') || '';
  const backupName = names.find((n) => n.startsWith('capnote-all-'));
  const html = text('Plan_ A_B.html');
  const note = JSON.parse(text('Plan_ A_B.json') || '{}');
  const backup = JSON.parse(text(backupName) || '{}');
  return {
    names: names.map((n) => (n === backupName ? 'capnote-all-<date>.json' : n)),
    txt: text('Plan_ A_B.txt'),
    html: {
      title: html.includes('<h1>Plan: A/B</h1>'),
      stylesInside: html.includes('<style>') && html.includes('.checklist-item'),
      task: html.includes('Done task') && html.includes('checked'),
      code: html.includes('const x = 1;'),
      tag: html.includes('work'),
    },
    json: { title: note.title, tags: note.tags, hasContent: note.content?.includes('bold') },
    pdf: files['Plan_ A_B.pdf']?.subarray(0, 5).toString('latin1'),
    backup: {
      notes: backup.notes?.map((n) => n.title),
      keys: Object.keys(backup).sort(),
      settingsLanguage: backup.settings?.language,
    },
  };
}

export const expectedFiles = {
  names: [
    'Plan_ A_B.html',
    'Plan_ A_B.json',
    'Plan_ A_B.pdf',
    'Plan_ A_B.txt',
    'capnote-all-<date>.json',
  ],
  txt: 'Plan: A/B\n\nBaşlık ğüşıöç\nSome bold text\n[x] Done task\n- Item\nconst x = 1;\ncell\ttwo\n1. first\n2. second\n',
  html: { title: true, stylesInside: true, task: true, code: true, tag: true },
  json: { title: 'Plan: A/B', tags: ['work'], hasContent: true },
  pdf: '%PDF-',
  backup: {
    notes: ['Plan: A/B'],
    keys: [
      'exportDate',
      'folders',
      'notes',
      'notifications',
      'reminders',
      'settings',
      'todos',
      'version',
    ],
    settingsLanguage: 'tr',
  },
};
