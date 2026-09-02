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
  // Things that change with the clock
  const freeze = () => {
    if (a.noteDate) a.noteDate.textContent = 'Sunday, March 1, 2026';
    document.querySelectorAll('.reminder-datetime-input').forEach((i) => (i.value = ''));
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
    a.selectNote(byTitle('Weekly plan'));
    await shot(theme + '-02-viewer');
    a.toggleSidebar();
    await shot(theme + '-02-viewer-sidebar-hidden');
    a.toggleSidebar();
    a.openNote(byTitle('Private diary'));
    await shot(theme + '-03-viewer-locked');
    a.selectNote(byTitle('Weekly plan'));
    await a.editCurrentNote();
    await shot(theme + '-04-editor');
    a.toggleEmojiPanel();
    await wait(600);
    await shot(theme + '-05-emoji');
    a.hideEmojiPanel();
    await wait(250);
    a.toggleMarkdownMode();
    await shot(theme + '-06-markdown-preview');
    a.toggleMarkdownMode();
    a.toggleHtmlMode();
    await new Promise((r) => {
      document.querySelector('iframe.preview-iframe').addEventListener('load', r, { once: true });
      setTimeout(r, 1500);
    });
    await shot(theme + '-07-html-preview');
    a.toggleHtmlMode();
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
    a.showNotificationsScreen();
    await shot(theme + '-21-notifications');
    a.selectNote(byTitle('Weekly plan'));
    a.showNotification('Note saved!', 'success');
    await shot(theme + '-22-toast', { keepToast: true });
    a.hideNotification();
  }
  a.applyTheme(false);
  return 'done';
}
