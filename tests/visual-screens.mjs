// The screens captured by tests/visual.mjs: every main screen and dialog, in the light and dark theme

export async function seed() {
  const t0 = '2026-03-01T09:30:00.000Z';
  const content =
    '<h2>Weekly plan</h2><p>Some <b>bold</b>, <i>italic</i> and <u>underlined</u> text with a <a href="https://example.com">link</a>.</p>' +
    '<ul><li>First item</li><li>Second item</li></ul>' +
    '<div class="checklist"><div class="checklist-item"><input type="checkbox" id="c1" checked="checked"><label for="c1">Done task</label></div><div class="checklist-item"><input type="checkbox" id="c2"><label for="c2">Open task</label></div></div>' +
    '<pre><code>const answer = 42;\nconsole.log(answer);</code></pre>' +
    '<table class="inserted-table" border="1" style="border-collapse: collapse; width: 100%;"><thead><tr><th style="padding:6px">A</th><th style="padding:6px">B</th></tr></thead><tbody><tr><td style="padding:6px">1</td><td style="padding:6px">2</td></tr></tbody></table>';
  const note = (id, title, extra = {}) => ({
    id,
    title,
    content,
    createdAt: t0,
    updatedAt: t0,
    tags: ['work', 'ideas'],
    mood: 'happy',
    weather: 'sunny',
    isFavorite: false,
    isPinned: false,
    isLocked: false,
    folderId: null,
    formatting: { fontFamily: 'Inter', fontSize: '14px' },
    history: [{ type: 'created', ts: t0 }],
    ...extra,
  });
  const api = window.electronAPI.storage;
  await api.save('notes', [
    note('1', 'Weekly plan', { isPinned: true, isFavorite: true }),
    note('2', 'Shopping list'),
    note('3', 'Project notes', { folderId: '100' }),
    note('4', 'Meeting summary', { folderId: '100' }),
    note('7', 'Reading list', {
      content:
        '<p>Follow up on <a class="note-link" data-note-id="1" href="#">Weekly plan</a>.</p>',
    }),
    note('6', 'Aligned', {
      content:
        '<p style="text-align: center;">Centered line</p>' +
        '<div class="checklist"><div class="checklist-item"><input type="checkbox" id="a1"><label for="a1" style="text-align: center;">Centered task</label></div></div>' +
        '<ul><li style="text-align: center;">Centered bullet</li></ul>' +
        '<ol><li style="text-align: right;">Right number</li></ol>' +
        '<div class="checklist"><div class="checklist-item"><input type="checkbox" id="a2" checked="checked"><label for="a2" style="text-align: right;">Right task</label></div></div>',
    }),
    note('5', 'Private diary', {
      folderId: '200',
      isLocked: true,
      content: '',
      encrypted: {
        v: 1,
        iterations: 1000,
        salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
        iv: 'AAAAAAAAAAAAAAAA',
        data: 'AAAA',
      },
    }),
  ]);
  await api.save('folders', [
    { id: '100', name: 'Work', color: '#3b82f6', expanded: true, createdAt: t0 },
    { id: '200', name: 'Personal', color: '#ef4444', expanded: true, createdAt: t0 },
  ]);
  await api.save('reminders', [
    {
      id: '10',
      noteId: '1',
      noteTitle: 'Weekly plan',
      datetime: '2030-01-01T09:00:00.000Z',
      recurrence: 'weekly',
      recurrenceDays: [1, 3],
      dismissed: false,
    },
  ]);
  await api.save('notifications', [
    {
      id: '20',
      noteId: '1',
      noteTitle: 'Weekly plan',
      kind: 'reminderDue',
      at: t0,
      time: t0,
      read: false,
    },
    {
      id: '21',
      noteId: '2',
      noteTitle: 'Shopping list',
      kind: 'reminderDue',
      at: t0,
      time: t0,
      read: true,
    },
  ]);
  await api.save('todos', [
    {
      id: 's1',
      name: 'Today',
      todos: [
        { id: 't1', text: 'Write report', completed: false, createdAt: t0 },
        { id: 't2', text: 'Call Alex', completed: true, createdAt: t0 },
      ],
    },
  ]);
  await api.save('settings', { lastViewedNoteId: '1' });
  return 'seeded';
}

export async function run() {
  const still = document.createElement('style');
  still.textContent =
    '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
  document.head.appendChild(still);
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // The overview counts from "today": a fixed day keeps its screenshot the same
  a.dashboardToday = '2026-03-02T12:00:00';
  a.calendarDate = null;
  a.calendarSelectedDay = '2026-03-01';
  // Things that change with the clock
  const freeze = () => {
    if (a.noteDate) a.noteDate.textContent = 'Sunday, March 1, 2026';
    document.querySelectorAll('.reminder-datetime-input').forEach((i) => (i.value = ''));
    a.renderReminderWhen();
    // The automatic backups are named after the real day they were taken
    document
      .querySelectorAll('.auto-backup label')
      .forEach((label) => (label.textContent = 'Pazar, 1 Mart 2026'));
  };
  const shot = async (name, { keepToast = false, keepFocus = false } = {}) => {
    freeze();
    if (!keepToast) a.hideNotification();
    await wait(400);
    // Dialogs move focus a moment after opening; drop it last so no focus ring is captured
    if (!keepFocus && document.activeElement && document.activeElement !== document.body)
      document.activeElement.blur();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.__shotDone = null;
    console.log('__SHOT__:' + name);
    for (let i = 0; i < 100 && window.__shotDone !== name; i++) await wait(50);
  };
  const closeAll = async () => {
    a.hideAllModals();
    a.hideEmojiPanel();
    a.hideContextMenu();
    a.hideSelectionMenu();
    a.templateMenu.classList.add('hidden');
    a.closeAllDropdowns();
    a.hideNoteContextMenu();
    a.sortDropdown.classList.add('hidden');
    await wait(50);
  };
  const byTitle = (t) => a.notes.find((n) => n.title === t);

  for (const theme of ['light', 'dark']) {
    a.applyTheme(theme === 'dark');
    await closeAll();
    await wait(1000);
    a.showWelcome();
    await shot(theme + '-01-welcome');
    // A note with a link to another note
    a.selectNote(byTitle('Reading list'));
    await shot(theme + '-02-viewer-note-link');
    a.selectNote(byTitle('Weekly plan'));
    await shot(theme + '-02-viewer');
    a.showTemplateMenu();
    await shot(theme + '-02-template-menu');
    a.templateMenu.classList.add('hidden');
    a.toggleSidebar();
    await shot(theme + '-02-viewer-sidebar-hidden');
    a.toggleSidebar();
    a.selectNote(byTitle('Aligned'));
    await shot(theme + '-02-viewer-aligned');
    a.openNote(byTitle('Private diary'));
    await shot(theme + '-03-viewer-locked');
    a.selectNote(byTitle('Weekly plan'));
    await a.editCurrentNote();
    await shot(theme + '-04-editor');
    // The reminder's date picker, then its time picker, each open under its button
    const side = document.querySelector('.editor-sidebar');
    a.reminderDateBtn.scrollIntoView({ block: 'end' });
    await wait(200);
    a.reminderDateBtn.click();
    a.reminderPicker.querySelector('[data-day="2026-03-05"]').click();
    a.reminderDateBtn.click();
    await shot(theme + '-04-reminder-date');
    a.reminderTimeBtn.click();
    a.reminderTimePicker.querySelector('.time-column[data-unit="hour"] [data-value="18"]').click();
    a.reminderTimePicker
      .querySelector('.time-column[data-unit="minute"] [data-value="30"]')
      .click();
    a.scrollTimeColumns();
    await shot(theme + '-04-reminder-time');
    a.resetReminderForm();
    side.scrollTop = 0;
    await wait(200);
    a.toggleEmojiPanel();
    await wait(600);
    await shot(theme + '-05-emoji');
    a.hideEmojiPanel();
    await wait(250);
    a.toggleMarkdownMode();
    await shot(theme + '-06-markdown-preview');
    a.toggleMarkdownMode();
    a.toggleHtmlMode();
    // The preview is taken once its sandboxed page has loaded (the frame marks itself). The frame
    // is painted in a process of its own and is not always in the first capture, so the shot is
    // taken twice: the first capture brings it in, the second (same file) keeps it.
    for (let i = 0; i < 80; i++) {
      if (document.querySelector('iframe.preview-iframe')?.dataset.loaded) break;
      await wait(50);
    }
    await wait(300);
    await shot(theme + '-07-html-preview');
    await wait(300);
    await shot(theme + '-07-html-preview');
    a.toggleHtmlMode();
    a.cancelEdit();
    // Suggestions while typing "[[" for a link to another note
    a.createNewNote();
    a.richEditor.innerHTML = '<p><br></p>';
    a.richEditor.focus();
    a.placeCaret(a.richEditor.querySelector('p'), 0);
    ['S', 'e', 'e', ' ', '[', '['].forEach((c) => document.execCommand('insertText', false, c));
    await shot(theme + '-07-note-link-menu', { keepFocus: true });
    a.hideNoteLinkMenu();
    a.cancelEdit();
    a.showNoteContextMenu(120, 236, byTitle('Weekly plan').id);
    await shot(theme + '-08-note-menu');
    await closeAll();
    const folder = document.querySelector('.folder-item');
    a.showFolderContextMenu(300, 420, folder.getAttribute('data-folder-id'));
    await shot(theme + '-09-context-menu');
    await closeAll();
    // Several notes selected: the selection menu with its folder list
    a.selectedNoteIds = new Set([byTitle('Weekly plan').id, byTitle('Shopping list').id]);
    a.markSelection();
    a.showSelectionMenuIfSelected(140, 300, 'note', byTitle('Shopping list').id);
    await shot(theme + '-09-selection-menu');
    a.hideSelectionMenu();
    a.clearSelection();
    await closeAll();
    // Renaming a note in place
    a.startRenameNote(
      byTitle('Shopping list'),
      document.querySelector(`.note-item[data-note-id="${byTitle('Shopping list').id}"]`)
    );
    await shot(theme + '-09-rename', { keepFocus: true });
    document
      .querySelector('.note-rename-input')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await wait(50);
    a.toggleSearch();
    a.searchInput.value = 'plan';
    a.searchNotes();
    await shot(theme + '-10-search');
    a.searchInput.value = '';
    a.searchNotes();
    await closeAll();
    a.toggleSort();
    await shot(theme + '-11-sort');
    await closeAll();
    a.showSettingsModal();
    for (const tab of ['general', 'appearance', 'notifications', 'system', 'data', 'about']) {
      document.querySelector(`.settings-tab[data-tab="${tab}"]`).click();
      await shot(theme + '-12-settings-' + tab);
    }
    await closeAll();
    a.showConfirm('Delete this note?', () => {});
    await shot(theme + '-13-confirm');
    await closeAll();
    a.showPasswordModal('Password', 'Enter it');
    await shot(theme + '-14-password');
    a.hidePasswordModal();
    a.showFolderModal();
    await shot(theme + '-15-folder-modal');
    await closeAll();
    a.showExportModal();
    await shot(theme + '-16-export-modal');
    await closeAll();
    a.showModal(a.tableModal);
    await shot(theme + '-17-table-modal');
    await closeAll();
    a.openNoteHistory();
    await shot(theme + '-18-history');
    await closeAll();
    a.showTodosScreen();
    await shot(theme + '-19-todos');
    a.showRemindersScreen();
    await shot(theme + '-20-reminders');
    a.showNotificationsScreen();
    await shot(theme + '-21-notifications');
    a.showTagsScreen('work');
    await shot(theme + '-21-tags');
    a.setTagFilter(null);
    // The archive page with an archived note
    byTitle('Reading list').isArchived = true;
    a.updateNotesList();
    a.showArchiveScreen();
    await shot(theme + '-21-archive');
    byTitle('Reading list').isArchived = false;
    a.updateNotesList();
    a.selectNote(byTitle('Weekly plan'));
    a.showNotification('Note saved!', 'success');
    await shot(theme + '-22-toast', { keepToast: true });
    a.hideNotification();
  }
  a.applyTheme(false);
  return 'done';
}
