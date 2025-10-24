class CapnoteApp {
  constructor() {
    this.currentNote = null;
    this.notes = [];
    this.folders = [];
    this.reminders = []; // Array of {id, noteId, datetime, noteTitle, dismissed}
    this.notifications = []; // Array of {id, noteId, noteTitle, message, time, read}
    this.currentFilter = 'all';
    this.currentSort = 'date-desc';
    this.selectedMood = null;
    this.selectedWeather = null;
    this.tags = [];
    this.hasChanges = false;
    this.originalNoteState = null;

    this.defaultFormatting = {
      fontFamily: 'Inter',
      fontSize: '14px',
    };
    this.baseFormatting = { ...this.defaultFormatting };
  this.savedSelection = null;

    this.init();
  }

  insertImageAtSelection(src, name) {
    if (!this.richEditor) return;
    const wrapper = document.createElement('span');
    wrapper.className = 'img-wrap';
    wrapper.contentEditable = 'false';

    const img = document.createElement('img');
    img.src = src;
    img.alt = name || '';
    img.className = 'embedded-image';

    const handle = document.createElement('span');
    handle.className = 'img-handle';

    wrapper.appendChild(img);
    wrapper.appendChild(handle);

    // insert wrapper at selection
    try {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(wrapper);
        range.setStartAfter(wrapper);
        range.collapse(true);
        sel.removeAllRanges(); sel.addRange(range);
      } else {
        this.richEditor.appendChild(wrapper);
      }
    } catch (err) {
      this.richEditor.appendChild(wrapper);
    }

    // click to select
    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      // toggle selection class
      Array.from(this.richEditor.querySelectorAll('.img-wrap.selected')).forEach((n) => n.classList.remove('selected'));
      wrapper.classList.add('selected');
    });

    // resize handling
    let isResizing = false;
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;

    const onMouseMove = (ev) => {
      if (!isResizing) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const newW = Math.max(24, startW + dx);
      img.style.width = newW + 'px';
      // keep height auto
    };

    const onMouseUp = () => {
      if (!isResizing) return;
      isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.trackContentChanges();
    };

    handle.addEventListener('mousedown', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      isResizing = true;
      startX = ev.clientX; startY = ev.clientY;
      startW = img.getBoundingClientRect().width;
      startH = img.getBoundingClientRect().height;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // clicking outside deselects
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) wrapper.classList.remove('selected');
    });
  }

  async init() {
    // Wait for i18n to be ready
    if (window.i18n && !window.i18n.translations.tr) {
      console.log('Waiting for i18n to initialize...');
      await new Promise(resolve => {
        const checkI18n = setInterval(() => {
          if (window.i18n.translations.tr && Object.keys(window.i18n.translations.tr).length > 0) {
            clearInterval(checkI18n);
            console.log('i18n is ready');
            resolve();
          }
        }, 100);
      });
    }
    
    await this.loadNotes();
    await this.loadReminders();
    await this.loadNotifications();
    this.initializeElements();
    this.setupEventListeners();
    this.loadSettings();
    this.loadSidebarPreference();
    this.initializeHamburgerIcon();
    this.updateUI();
    this.updateStats();
    this.startReminderChecker();

  // Make sure the current filter (default: 'all') is applied so
  // the corresponding nav item appears active on startup
  this.changeFilter(this.currentFilter);

  // Load last viewed note if available
  this.loadLastViewedNote();
  }

  initializeElements() {
    // Ana elementler
    this.welcomeScreen = document.getElementById('welcomeScreen');
    this.noteEditor = document.getElementById('noteEditor');
    this.noteViewer = document.getElementById('noteViewer');
    this.notesList = document.getElementById('notesList');

    // Butonlar
    this.homeBtn = document.getElementById('homeBtn');
    this.newNoteBtn = document.getElementById('newNoteBtn');
    this.startFirstNoteBtn = document.getElementById('startFirstNote');
    this.saveNoteBtn = document.getElementById('saveNoteBtn');
    this.cancelNoteBtn = document.getElementById('cancelNoteBtn');
    this.editNoteBtn = document.getElementById('editNoteBtn');
    this.deleteNoteBtn = document.getElementById('deleteNoteBtn');
    this.favoriteViewBtn = document.getElementById('favoriteViewBtn');
    this.duplicateNoteBtn = document.getElementById('duplicateNoteBtn');
    this.exportNoteBtn = document.getElementById('exportNoteBtn');

    // Form elementleri
    this.noteTitle = document.getElementById('noteTitle');
    this.richEditor = document.getElementById('noteContentEditable');
    this.searchInput = document.getElementById('searchInput');
    this.sortSelect = document.getElementById('sortSelect');
    this.tagInput = document.getElementById('tagInput');
    this.tagsList = document.getElementById('tagsList');

    // New control elements
    this.searchBtn = document.getElementById('searchBtn');
    this.sortBtn = document.getElementById('sortBtn');
    this.searchContainer = document.getElementById('searchContainer');
    this.sortDropdown = document.getElementById('sortDropdown');

  // Markdown controls
  this.toggleMarkdownBtn = document.getElementById('toggleMarkdownBtn');
  this.markdownEditor = document.getElementById('markdownEditor');
  this.markdownPreview = document.getElementById('markdownPreview');
  this.toggleHtmlBtn = document.getElementById('toggleHtmlBtn');
  this.htmlPreview = document.getElementById('htmlPreview');
  this.insertCodeBlockBtn = document.getElementById('insertCodeBlockBtn');
  this.browseImageBtn = document.getElementById('browseImageBtn');
  this.browseImageInput = document.getElementById('browseImageInput');

    // Formatting toolbar
    this.fontFamilyDropdown = document.getElementById('fontFamily');
    this.fontSizeDropdown = document.getElementById('fontSize');
    this.textColor = document.getElementById('textColor');
    this.bgColor = document.getElementById('bgColor');

    // Durum elementleri
    this.viewerTitle = document.getElementById('viewerTitle');
    this.viewerDate = document.getElementById('viewerDate');
    this.viewerMood = document.getElementById('viewerMood');
    this.viewerWeather = document.getElementById('viewerWeather');
    this.viewerTags = document.getElementById('viewerTags');
    this.viewerText = document.getElementById('viewerText');
    this.viewerWordCount = document.getElementById('viewerWordCount');

    // Reminders elements
    this.remindersScreen = document.getElementById('remindersScreen');
    this.remindersNav = document.getElementById('remindersNav');
    this.remindersList = document.getElementById('remindersList');
    this.activeRemindersCount = document.getElementById('activeRemindersCount');
    this.reminderDatetime = document.getElementById('reminderDatetime');
  this.reminderRecurrence = document.getElementById('reminderRecurrence');
    this.setReminderBtn = document.getElementById('setReminderBtn');
    this.noteRemindersList = document.getElementById('noteRemindersList');

    // Notifications elements
    this.notificationsScreen = document.getElementById('notificationsScreen');
    this.notificationsNav = document.getElementById('notificationsNav');
    this.notificationsList = document.getElementById('notificationsList');
    this.activeNotificationsCount = document.getElementById('activeNotificationsCount');
    this.notificationsUnreadBadge = document.getElementById('notificationsUnreadBadge');
  this.markAllReadBtn = document.getElementById('markAllReadBtn');

  this.viewerCharCount = document.getElementById('viewerCharCount');
    this.readingTime = document.getElementById('readingTime');
    this.lastModified = document.getElementById('lastModified');
  this.noteHistoryModal = document.getElementById('noteHistoryModal');
  this.historyBody = document.getElementById('historyBody');
  this.closeHistoryModal = document.getElementById('closeHistoryModal');
  this.historyCloseBtn = document.getElementById('historyCloseBtn');

    // Editor meta bilgileri
    this.noteDate = document.getElementById('noteDate');
    this.wordCount = document.getElementById('wordCount');
    this.charCount = document.getElementById('charCount');
  this.editorReadingTime = document.getElementById('editorReadingTime');

    // Filter tabs (modern navigation)
    this.filterTabs = document.querySelectorAll(
      '.nav-item[data-filter], .nav-subitem[data-filter]'
    );

    // Notes list container
    this.notesListContainer = document.getElementById('notesListContainer');

    // Modal elementler
    this.confirmModal = document.getElementById('confirmModal');
    this.confirmBtn = document.getElementById('confirmBtn');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.confirmMessage = document.getElementById('confirmMessage');
    this.exportModal = document.getElementById('exportModal');
    this.pickerModal = document.getElementById('pickerModal');
    this.settingsModal = document.getElementById('settingsModal');

    // Settings elements
    this.settingsBtn = document.getElementById('settingsBtn');
    this.helpSupport = document.getElementById('helpSupport');
  this.toggleNativeNotifications = document.getElementById('toggleNativeNotifications');
  this.testNativeNotifBtn = document.getElementById('testNativeNotifBtn');
  this.clearAllNotesBtn = document.getElementById('clearAllNotesBtn');
  this.clearAllFoldersBtn = document.getElementById('clearAllFoldersBtn');
  this.clearAllContentBtn = document.getElementById('clearAllContentBtn');
  this.maxPinnedSelect = document.getElementById('maxPinnedSelect');
    this.darkModeToggle = document.getElementById('darkModeToggle');
  this.languageSelect = document.getElementById('languageSelect');
  this.accentYellowBtn = document.getElementById('accentYellow');
  this.accentCherryBtn = document.getElementById('accentCherry');
  this.accentAppleBtn = document.getElementById('accentApple');
  this.accentPurpleBtn = document.getElementById('accentPurple');
  this.accentBlueBtn = document.getElementById('accentBlue');
  this.syncFolderAccentToggle = document.getElementById('syncFolderAccentToggle');
  // System settings toggles
  this.startAtLoginToggle = document.getElementById('startAtLoginToggle');
  this.closeToTrayToggle = document.getElementById('closeToTrayToggle');

    // Folder elements
    this.addFolderBtn = document.getElementById('addFolderBtn');
    this.folderModal = document.getElementById('folderModal');
    this.folderNameInput = document.getElementById('folderNameInput');
    this.createFolderBtn = document.getElementById('createFolderBtn');
    this.cancelFolderBtn = document.getElementById('cancelFolderBtn');
    this.foldersList = document.getElementById('foldersList');
    this.importNotesBtn = document.getElementById('importNotesBtn');
    this.exportAllNotesBtn = document.getElementById('exportAllNotesBtn');
  this.importAllDataBtn = document.getElementById('importAllDataBtn');
  this.exportAllDataBtn = document.getElementById('exportAllDataBtn');
  // Table modal elements (editor table insertion)
  this.insertTableBtn = document.getElementById('insertTableBtn');
  this.tableModal = document.getElementById('tableModal');
  this.closeTableModal = document.getElementById('closeTableModal');
  this.tableRowsInput = document.getElementById('tableRows');
  this.tableColsInput = document.getElementById('tableCols');
  this.tableHeaderCheckbox = document.getElementById('tableHeader');
  this.insertTableConfirmBtn = document.getElementById('insertTableConfirmBtn');
  this.cancelTableBtn = document.getElementById('cancelTableBtn');
    this.toggleSidebarBtn = document.getElementById('toggleSidebar');
    this.editorSidebar = document.querySelector('.editor-sidebar');

    // Context menu
    this.contextMenu = document.getElementById('contextMenu');
    this.deleteFolderMenuItem = document.getElementById('deleteFolderMenuItem');
  this.renameFolderMenuItem = document.getElementById('renameFolderMenuItem');
  this.changeFolderColorMenuItem = document.getElementById('changeFolderColorMenuItem');
  this.folderColorPicker = document.getElementById('folderColorPicker');
  this.folderColorModal = document.getElementById('folderColorModal');
  this.folderColorInput = document.getElementById('folderColorInput');
  this.saveFolderColorBtn = document.getElementById('saveFolderColorBtn');
  this.cancelFolderColorBtn = document.getElementById('cancelFolderColorBtn');
  this.closeFolderColorModal = document.getElementById('closeFolderColorModal');

    // Bildirim
    this.notification = document.getElementById('notification');
    this.notificationText = document.getElementById('notificationText');
    this.notificationIcon = document.getElementById('notificationIcon');

    // Stats
    this.totalNotes = document.getElementById('totalNotes');
    this.daysActive = document.getElementById('daysActive');
    this.totalWords = document.getElementById('totalWords');

    // Mood ve Weather butonları
    this.moodBtns = document.querySelectorAll('.mood-btn');
    this.weatherBtns = document.querySelectorAll('.weather-btn');
    // Emoji toolbar/panel elements
    this.openEmojiBtn = document.getElementById('openEmojiBtn');
    this.emojiPanel = document.getElementById('emojiPanel');
    this.emojiGrid = document.getElementById('emojiGrid');
  this.emojiSearchInput = document.getElementById('emojiSearchInput');

    // If the emoji panel is placed inside a transformed or positioned ancestor it can
    // change how `position: fixed` is calculated. Move it to document.body so JS can
    // place it reliably relative to the viewport using getBoundingClientRect.
    try {
      if (this.emojiPanel && this.emojiPanel.parentElement !== document.body) {
        document.body.appendChild(this.emojiPanel);
      }
    } catch (e) {
      // ignore DOM move errors
    }

    // Password Modal
    this.passwordModal = document.getElementById('passwordModal');
    this.passwordInput = document.getElementById('passwordInput');
    this.passwordModalTitle = document.getElementById('passwordModalTitle');
    this.passwordMessage = document.getElementById('passwordMessage');
    this.confirmPasswordBtn = document.getElementById('confirmPasswordBtn');
    this.cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    this.closePasswordModal = document.getElementById('closePasswordModal');

    // Note state tracking
    this.currentNoteContent = '';
    this.lastSavedContent = '';
    this.isAutoSaved = false;

    // Current note properties
    this.selectedMood = null;
    this.selectedWeather = null;
    this.tags = [];
    this.currentNote = null;
    this.isSidebarVisible = true;
  }

  setupEventListeners() {
    // Titlebar controls
    document.getElementById('minimizeBtn')?.addEventListener('click', () => {
      window.electronAPI.minimize();
    });

    document.getElementById('maximizeBtn')?.addEventListener('click', () => {
      window.electronAPI.maximize();
    });

    document.getElementById('closeBtn')?.addEventListener('click', () => {
      window.electronAPI.close();
    });

    // Hamburger menu
    document.getElementById('hamburgerBtn')?.addEventListener('click', () => {
      this.toggleSidebar();
    });

    // Ana butonlar
    this.homeBtn.addEventListener('click', () => this.showWelcome());
    this.newNoteBtn.addEventListener('click', () => this.createNewNote());
    this.settingsBtn.addEventListener('click', () => this.showSettingsModal());
    this.helpSupport.addEventListener('click', () => this.showSettingsModal());
  
  // Language selector
  if (this.languageSelect) {
    this.languageSelect.addEventListener('change', (e) => {
      const lang = e.target.value;
      console.log('Language selector changed to:', lang);
      if (window.i18n) {
        window.i18n.setLanguage(lang);
        this.showNotification(window.i18n.t('messages.languageChanged'), 'success');
        // Update dynamic content that may not have data-i18n attributes
        this.updateDynamicTranslations();
      } else {
        console.error('window.i18n is not available');
      }
    });
    console.log('Language selector event listener attached');
  } else {
    console.error('Language selector element not found!');
  }

  // Accent swatches
  this.accentYellowBtn?.addEventListener('click', (e) => this.setAccentColor(e.currentTarget.dataset.color || '#f59e0b'));
  this.accentCherryBtn?.addEventListener('click', (e) => this.setAccentColor(e.currentTarget.dataset.color || '#e11d48'));
  this.accentAppleBtn?.addEventListener('click', (e) => this.setAccentColor(e.currentTarget.dataset.color || '#22c55e'));
  this.accentPurpleBtn?.addEventListener('click', (e) => this.setAccentColor(e.currentTarget.dataset.color || '#8b5cf6'));
  this.accentBlueBtn?.addEventListener('click', (e) => this.setAccentColor(e.currentTarget.dataset.color || '#3b82f6'));
  this.syncFolderAccentToggle?.addEventListener('change', (e) => {
    const enabled = e.currentTarget.checked;
    localStorage.setItem('syncFolderAccent', enabled ? '1' : '0');
    this.applyFolderAccentSync(enabled);
    this.updateFoldersList();
  });

  // Native/system notifications toggle
  this.toggleNativeNotifications?.addEventListener('change', (e) => {
    const enabled = e.currentTarget.checked;
    localStorage.setItem('settings.nativeNotifications', enabled ? '1' : '0');
    this.showNotification(enabled ? window.i18n.t('messages.systemNotificationsEnabled') : window.i18n.t('messages.systemNotificationsDisabled'), 'success');
  });
  // Start at login toggle
  this.startAtLoginToggle?.addEventListener('change', async (e) => {
    try {
      const enabled = !!e.currentTarget.checked;
      if (window.electronAPI && typeof window.electronAPI.setStartAtLogin === 'function') {
        const res = await window.electronAPI.setStartAtLogin(enabled);
        if (!res || res.ok !== true) throw new Error(res && res.error ? res.error : 'Bilinmeyen hata');
        this.showNotification(enabled ? window.i18n.t('messages.launchOnStartupEnabled') : window.i18n.t('messages.launchOnStartupDisabled'), 'success');
      }
    } catch (err) {
      console.warn('setStartAtLogin failed:', err);
      // revert checkbox
      if (this.startAtLoginToggle) this.startAtLoginToggle.checked = !this.startAtLoginToggle.checked;
  this.showNotification(window.i18n.t('messages.launchOnStartupError'), 'error');
    }
  });
  // Close to tray toggle: only wire on Windows (hide on macOS/Linux)
  try {
    const plat = (window.electronAPI && window.electronAPI.platform) ? window.electronAPI.platform : (navigator.platform || '').toLowerCase();
    if (plat === 'win32' && this.closeToTrayToggle) {
      this.closeToTrayToggle.addEventListener('change', async (e) => {
        try {
          const enabled = !!e.currentTarget.checked;
          if (window.electronAPI && typeof window.electronAPI.setCloseToTray === 'function') {
            const res = await window.electronAPI.setCloseToTray(enabled);
            if (!res || res.ok !== true) throw new Error(res && res.error ? res.error : 'Bilinmeyen hata');
            this.showNotification(enabled ? window.i18n.t('messages.minimizeToTrayEnabled') : window.i18n.t('messages.minimizeToTrayDisabled'), 'success');
          }
        } catch (err) {
          console.warn('setCloseToTray failed:', err);
          if (this.closeToTrayToggle) this.closeToTrayToggle.checked = !this.closeToTrayToggle.checked;
          this.showNotification(window.i18n.t('messages.minimizeToTrayError'), 'error');
        }
      });
    } else {
      // hide the close-to-tray UI on non-Windows: find nearest .setting-item container
      try {
        if (this.closeToTrayToggle) {
          let el = this.closeToTrayToggle;
          while (el && !el.classList.contains('setting-item')) el = el.parentElement;
          if (el) el.style.display = 'none';
        }
      } catch (hideErr) {}
    }
  } catch (err) {
    // ignore
  }
  

  // Tray context menu -> open notifications
  try {
    if (window.electronAPI && typeof window.electronAPI.onOpenNotifications === 'function') {
      window.electronAPI.onOpenNotifications(() => this.showNotificationsScreen());
    }
  } catch {}

  // Tray context menu -> new note
  try {
    if (window.electronAPI && typeof window.electronAPI.onNewNote === 'function') {
      window.electronAPI.onNewNote(() => this.createNewNote());
    }
  } catch {}

  // Tray context menu -> settings
  try {
    if (window.electronAPI && typeof window.electronAPI.onOpenSettings === 'function') {
      window.electronAPI.onOpenSettings(() => this.showSettingsModal());
    }
  } catch {}
  // Test notification button (with cooldown)
  this.testNativeNotifBtn?.addEventListener('click', () => this.handleTestNotificationClick());
    this.startFirstNoteBtn.addEventListener('click', () => this.createNewNote());
    this.saveNoteBtn.addEventListener('click', () => this.saveNote());
    this.cancelNoteBtn.addEventListener('click', () => this.cancelEdit());
    this.editNoteBtn.addEventListener('click', () => this.editCurrentNote());
    this.deleteNoteBtn.addEventListener('click', () => this.deleteCurrentNote());
    this.favoriteViewBtn.addEventListener('click', () => this.toggleFavoriteView());
    this.duplicateNoteBtn.addEventListener('click', () => this.duplicateNote());
    this.exportNoteBtn.addEventListener('click', () => this.showExportModal());

    // Arama ve filtreler
    this.searchInput.addEventListener('input', (e) => this.searchNotes(e.target.value));

  // Markdown toggle and preview
  if (this.toggleMarkdownBtn) this.toggleMarkdownBtn.addEventListener('click', () => this.toggleMarkdownMode());
  if (this.toggleHtmlBtn) this.toggleHtmlBtn.addEventListener('click', () => this.toggleHtmlMode());
  if (this.insertCodeBlockBtn) this.insertCodeBlockBtn.addEventListener('click', () => this.insertCodeBlock());
  if (this.markdownEditor) this.markdownEditor.addEventListener('input', () => {
    // If preview is visible, live-update it (debounced would be better, but keep simple)
    if (this.markdownPreview && !this.markdownPreview.classList.contains('hidden')) {
      this.renderMarkdownPreview(this.markdownEditor.value);
    }
    this.trackContentChanges();
  });

    // New control buttons
    this.searchBtn?.addEventListener('click', () => this.toggleSearch());
    this.sortBtn?.addEventListener('click', () => this.toggleSort());

    // Folder control buttons
    this.addFolderBtn?.addEventListener('click', () => this.showFolderModal());
    this.createFolderBtn?.addEventListener('click', () => this.createFolder());
    this.cancelFolderBtn?.addEventListener('click', () => this.hideFolderModal());

    // Context menu
  this.changeFolderColorMenuItem?.addEventListener('click', () => this.openFolderColorModal());
    this.renameFolderMenuItem?.addEventListener('click', () => this.renameSelectedFolder());
    this.deleteFolderMenuItem?.addEventListener('click', () => this.deleteSelectedFolder());

    // Folder color modal handlers
    this.saveFolderColorBtn?.addEventListener('click', () => {
      const color = this.folderColorInput.value;
      this.applySelectedFolderColor(color);
      this.hideModal(this.folderColorModal);
    });
    // Show/hide weekday selector when recurrence changes
    if (this.reminderRecurrence) {
      this.reminderRecurrence.addEventListener('change', (e) => {
        try {
          const val = e.currentTarget.value;
          const wk = document.getElementById('reminderWeekdays');
          if (wk) {
            if (val === 'weekly') {
              wk.classList.remove('hidden');
              wk.setAttribute('aria-hidden', 'false');
            } else {
              wk.classList.add('hidden');
              wk.setAttribute('aria-hidden', 'true');
            }
          }
        } catch (err) {}
      });
    }
    this.cancelFolderColorBtn?.addEventListener('click', () => {
      this.hideModal(this.folderColorModal);
    });
    this.closeFolderColorModal?.addEventListener('click', () => {
      this.hideModal(this.folderColorModal);
    });

    // Hide context menu when clicking elsewhere
    document.addEventListener('click', () => this.hideContextMenu());

    // Notes list container drag-drop (for moving notes out of folders)
    const notesListContainer = document.getElementById('notesListContainer');
    if (notesListContainer) {
      notesListContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        // If the active drag is a folder, ignore: folders should not be dropped into the "no-folder" area
        const types = e.dataTransfer && e.dataTransfer.types ? Array.from(e.dataTransfer.types) : [];
        let isFolderDrag = false;
        try {
          isFolderDrag = types.includes('text/folder-id') || Boolean(e.dataTransfer.getData && e.dataTransfer.getData('text/folder-id'));
        } catch (err) {
          isFolderDrag = types.includes('text/folder-id');
        }
        if (isFolderDrag) {
          // do not show drop target for folders
          return;
        }

        notesListContainer.classList.add('drag-over');
      });

      notesListContainer.addEventListener('dragleave', (e) => {
        // Only remove drag-over if leaving the container entirely
        if (!notesListContainer.contains(e.relatedTarget)) {
          notesListContainer.classList.remove('drag-over');
        }
      });

        notesListContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        notesListContainer.classList.remove('drag-over');
        // If a folder is being dragged, ignore the drop here
        try {
          const folderId = e.dataTransfer.getData('text/folder-id');
          if (folderId) {
            return;
          }
        } catch (err) {
          // ignore getData errors and continue
        }

        const noteId = e.dataTransfer.getData('text/plain');
        this.moveNoteToFolder(parseInt(noteId), 'default');
      });
    }

    // Sort dropdown options
    document.querySelectorAll('.sort-option').forEach((option) => {
      option.addEventListener('click', (e) => {
        // Remove active from all options
        document.querySelectorAll('.sort-option').forEach((opt) => opt.classList.remove('active'));
        // Add active to clicked option
        e.currentTarget.classList.add('active');
        // Apply sort
        this.setSortOrder(e.currentTarget.dataset.value);
        // Close dropdown
        this.sortDropdown.classList.add('hidden');
        this.sortBtn.classList.remove('active');
      });
    });

    // Custom dropdown setup
    this.setupCustomDropdown();

    // Navigation items - modern sidebar
    document
      .querySelectorAll('.nav-item[data-filter], .nav-subitem[data-filter]')
      .forEach((item) => {
        item.addEventListener('click', (e) => {
          const clickedFilter = e.currentTarget.dataset.filter;

          // Toggle functionality: if clicking the same filter, deactivate it
            if (this.currentFilter === clickedFilter) {
              // Remove active from filter-group items only (keep reminders/notifications state)
              document
                .querySelectorAll('.nav-item[data-filter], .nav-subitem[data-filter]')
                .forEach((nav) => nav.classList.remove('active'));
              // Reset to "all" filter
              this.changeFilter('all');
              // Make "all" filter active
              document.querySelector('[data-filter="all"]').classList.add('active');
            } else {
              // Remove active from other filter-group items only
              document
                .querySelectorAll('.nav-item[data-filter], .nav-subitem[data-filter]')
                .forEach((nav) => nav.classList.remove('active'));
              // Add active to clicked filter item
              e.currentTarget.classList.add('active');
              // Apply filter
              this.changeFilter(clickedFilter);
            }
        });
      });

    // New note navigation item
    document.getElementById('newNoteNav')?.addEventListener('click', () => this.createNewNote());

    // Expandable nav items
    document.querySelectorAll('.nav-expandable').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        item.classList.toggle('expanded');

        // Special handling for notes toggle
        if (item.id === 'notesToggle') {
          const notesContainer = document.getElementById('notesListContainer');
          const chevron = item.querySelector('.nav-expand');

          if (item.classList.contains('expanded')) {
            notesContainer.classList.remove('hidden');
            chevron.style.transform = 'rotate(0deg)';
          } else {
            notesContainer.classList.add('hidden');
            chevron.style.transform = 'rotate(-90deg)';
          }
        }
      });
    });

    // Event delegation for note action buttons
    this.notesList.addEventListener('click', (e) => {
      const target = e.target.closest('.note-action-btn');
      if (target) {
        e.stopPropagation();
        const noteId = target.getAttribute('data-note-id');

        if (target.classList.contains('lock-btn') && noteId) {
          this.toggleLock(noteId);
        } else if (target.classList.contains('favorite-btn') && noteId) {
          this.toggleNoteFavorite(noteId);
        } else if (target.classList.contains('pin-btn') && noteId) {
          this.togglePin(noteId);
        } else if (target.classList.contains('delete-btn') && noteId) {
          this.deleteNoteById(noteId);
        }
      }
    });

    // Rich editor events
    this.richEditor.addEventListener('input', () => {
      this.updateWordCount();
      this.trackContentChanges();
    });

    // Allow Enter inside <code> blocks in rich editor to create newlines instead of splitting nodes
    this.richEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const codeAncestor = range.startContainer.nodeType === Node.ELEMENT_NODE
          ? range.startContainer.closest && range.startContainer.closest('code')
          : range.startContainer.parentElement && range.startContainer.parentElement.closest('code');
        // also detect a containing <pre> in case selection sits directly inside <pre>
        const preAncestor = range.startContainer.nodeType === Node.ELEMENT_NODE
          ? range.startContainer.closest && range.startContainer.closest('pre')
          : range.startContainer.parentElement && range.startContainer.parentElement.closest('pre');
        if (codeAncestor || preAncestor) {
          // inside a <code> node. Allow exiting the code block via Ctrl/Cmd+Enter or
          // by pressing Enter on an empty line at the end of the code block.
          // If exit is requested, create a paragraph after the containing <pre> and move caret there.
          const isExitShortcut = e.ctrlKey || e.metaKey;
          // determine the text node and its content length
          let node = range.startContainer;
          let offset = range.startOffset;
          // If the user pressed Ctrl/Cmd+Enter, immediately exit the nearest <pre> by
          // inserting a paragraph after it. This avoids edge cases where selection
          // nodes are in unusual spots and makes the shortcut reliable.
          if (isExitShortcut) {
            e.preventDefault();
            try {
              // find a <pre> ancestor starting from the startContainer
              let findNode = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
              while (findNode && findNode !== this.richEditor && findNode.tagName && findNode.tagName.toLowerCase() !== 'pre') {
                findNode = findNode.parentElement;
              }
              const resolvedPre = findNode && findNode.tagName && findNode.tagName.toLowerCase() === 'pre' ? findNode : null;
              const para = document.createElement('p');
              para.innerHTML = '<br>';
              if (resolvedPre && resolvedPre.parentNode) {
                if (resolvedPre.nextSibling) resolvedPre.parentNode.insertBefore(para, resolvedPre.nextSibling);
                else resolvedPre.parentNode.appendChild(para);
              } else {
                // fallback: append to editor
                this.richEditor.appendChild(para);
              }
              const newSel = window.getSelection();
              const newRange = document.createRange();
              newRange.setStart(para, 0);
              newRange.collapse(true);
              newSel.removeAllRanges();
              newSel.addRange(newRange);
              this.richEditor.focus();
              this.trackContentChanges();
            } catch (err) {
              // ignore; allow other logic to try
            }
            return;
          }
          if (node.nodeType !== Node.TEXT_NODE) {
            if (node.childNodes[offset] && node.childNodes[offset].nodeType === Node.TEXT_NODE) {
              node = node.childNodes[offset];
              offset = 0;
            }
          }
          const nodeText = node && node.nodeType === Node.TEXT_NODE ? (node.nodeValue || '') : '';
          // Robust check: create a range from caret to the end of the codeAncestor and
          // if the substring is empty (or whitespace) the caret is effectively at the end.
          let atEndOfCode = false;
          try {
            const tempRange = document.createRange();
            tempRange.setStart(node, offset);
            // find deepest last descendant of the codeAncestor
            let last = codeAncestor;
            while (last && last.lastChild) last = last.lastChild;
            if (last) {
              if (last.nodeType === Node.TEXT_NODE) {
                tempRange.setEnd(last, last.nodeValue ? last.nodeValue.length : 0);
              } else {
                tempRange.setEndAfter(last);
              }
            } else {
              tempRange.setEnd(codeAncestor, codeAncestor.childNodes.length || 0);
            }
            const remainder = tempRange.toString();
            atEndOfCode = remainder === '' || remainder.trim() === '';
          } catch (err) {
            atEndOfCode = nodeText.length === 0 || offset >= nodeText.length;
          }

          
          // If user pressed Ctrl/Cmd+Enter, always exit the code block
          if (isExitShortcut) {
            e.preventDefault();
            try {
              // prefer the actual <pre> ancestor if present
              const resolvedPre = preAncestor || (codeAncestor && (codeAncestor.closest ? codeAncestor.closest('pre') : codeAncestor.parentElement));
              const para = document.createElement('p');
              para.innerHTML = '<br>';
              if (resolvedPre && resolvedPre.parentNode) {
                if (resolvedPre.nextSibling) resolvedPre.parentNode.insertBefore(para, resolvedPre.nextSibling);
                else resolvedPre.parentNode.appendChild(para);
              } else {
                // fallback: append to editor
                this.richEditor.appendChild(para);
              }
              // move caret into the new paragraph
              const newSel = window.getSelection();
              const newRange = document.createRange();
              newRange.setStart(para, 0);
              newRange.collapse(true);
              newSel.removeAllRanges();
              newSel.addRange(newRange);
              this.richEditor.focus();
              this.trackContentChanges();
            } catch (err) {
              // fallback to inserting newline inside code block
            }
            return;
          }
          // otherwise we're inside a <code> node: insert a newline at the caret.
          // Only Ctrl/Cmd+Enter above exits the code block; plain Enter should reliably add a newline.
          e.preventDefault();
          try {
            
            // Ensure we operate on a text node if possible
            if (node.nodeType !== Node.TEXT_NODE) {
              // prefer a text child at the offset
              if (node.childNodes && node.childNodes[offset] && node.childNodes[offset].nodeType === Node.TEXT_NODE) {
                node = node.childNodes[offset];
                offset = 0;
              } else {
                // try previous sibling text node
                let prev = node.childNodes && node.childNodes[offset - 1] ? node.childNodes[offset - 1] : null;
                while (prev && prev.nodeType !== Node.TEXT_NODE) prev = prev && prev.previousSibling ? prev.previousSibling : null;
                if (prev && prev.nodeType === Node.TEXT_NODE) {
                  node = prev;
                  offset = node.nodeValue ? node.nodeValue.length : 0;
                }
              }
            }

            // If we found or coerced to a text node, insert into it
            if (node && node.nodeType === Node.TEXT_NODE) {
              
              const text = node.nodeValue || '';
              const before = text.substring(0, offset);
              let after = text.substring(offset);
              // if the text after caret already begins with a ZWSP, avoid adding another
              const ZW = '\u200B';
              let insertMarker = ZW;
              if (after && after.startsWith(ZW)) insertMarker = '';
              node.nodeValue = before + '\n' + insertMarker + after;
              // place caret after the inserted newline (before the marker)
              const newRange = document.createRange();
              newRange.setStart(node, before.length + 1);
              newRange.collapse(true);
              sel.removeAllRanges();
              sel.addRange(newRange);
              this.trackContentChanges();
            } else {
              
              // fallback: append a text node with newline to the deepest codeAncestor and place caret after it
              const textNode = document.createTextNode('\n');
              // find a sensible insertion point: prefer range.insertNode if possible
              try {
                // if inserting a new line node, include a ZWSP so caret has a visible spot
                const ZW = '\u200B';
                if (!textNode.nodeValue || !textNode.nodeValue.startsWith('\n')) textNode.nodeValue = '\n' + ZW;
                range.insertNode(textNode);
                // move caret after inserted node (position will be after the newline)
                range.setStartAfter(textNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              } catch (innerErr) {
                try {
                  // fallback to appending to codeAncestor
                  (codeAncestor || this.richEditor).appendChild(textNode);
                  const newRange2 = document.createRange();
                  newRange2.setStartAfter(textNode);
                  newRange2.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(newRange2);
                } catch (finalErr) {
                  // as a last resort, insert a paragraph after the pre (exit behavior)
                  try {
                    const para = document.createElement('p');
                    para.innerHTML = '<br>';
                    const resolvedPre = preAncestor || (codeAncestor && (codeAncestor.closest ? codeAncestor.closest('pre') : codeAncestor.parentElement));
                    if (resolvedPre && resolvedPre.parentNode) {
                      if (resolvedPre.nextSibling) resolvedPre.parentNode.insertBefore(para, resolvedPre.nextSibling);
                      else resolvedPre.parentNode.appendChild(para);
                    } else {
                      this.richEditor.appendChild(para);
                    }
                    const newSel = window.getSelection();
                    const newRange3 = document.createRange();
                    newRange3.setStart(para, 0);
                    newRange3.collapse(true);
                    newSel.removeAllRanges();
                    newSel.addRange(newRange3);
                  } catch (err) {}
                }
              }
              this.trackContentChanges();
            }
          } catch (err) {
            // ignore insertion failures and allow normal behavior as a fallback
          }
        }
      }
    });

    // Track selection for formatter usage
    this.richEditor.addEventListener('mouseup', () => this.captureEditorSelection());
    this.richEditor.addEventListener('keyup', () => this.captureEditorSelection());

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (
        !e.target.closest('.nav-section-controls') &&
        !e.target.closest('.search-container') &&
        !e.target.closest('.sort-dropdown')
      ) {
        this.searchContainer?.classList.add('hidden');
        this.sortDropdown?.classList.add('hidden');
        this.searchBtn?.classList.remove('active');
        this.sortBtn?.classList.remove('active');
      }
    });
    this.richEditor.addEventListener('paste', (e) => this.handlePaste(e));
    // Drag & drop support: accept files/images dropped into the rich editor
    this.richEditor.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      this.richEditor.classList.add('drag-over');
    });
    this.richEditor.addEventListener('dragleave', (e) => {
      this.richEditor.classList.remove('drag-over');
    });
    this.richEditor.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.richEditor.classList.remove('drag-over');
      const dt = e.dataTransfer;
      if (!dt || !dt.files || dt.files.length === 0) return;
      for (let i = 0; i < dt.files.length; i++) {
        const f = dt.files[i];
        try {
          // ask main process to copy file into app uploads and return a file:// URL
          const saved = await window.electronAPI.saveDroppedFile(f.path);
          if (!saved) continue;
          // decide how to insert: if image mime type, insert <img>, otherwise insert link
          const lower = (f.type || '').toLowerCase();
          if (lower.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name)) {
            this.insertImageAtSelection(saved, f.name);
          } else {
            const a = document.createElement('a');
            a.href = saved;
            a.textContent = f.name;
            a.target = '_blank';
            try {
              const sel = window.getSelection();
              if (sel && sel.rangeCount) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(a);
                range.setStartAfter(a);
                range.collapse(true);
                sel.removeAllRanges(); sel.addRange(range);
              } else {
                this.richEditor.appendChild(a);
              }
            } catch (err) {
              this.richEditor.appendChild(a);
            }
          }
          this.trackContentChanges();
        } catch (err) {
          console.error('Drop handling failed for', f, err);
        }
      }
    });
    this.richEditor.addEventListener('mouseup', () => this.updateFormatPanelFromSelection());
    this.richEditor.addEventListener('keyup', () => this.updateFormatPanelFromSelection());

    // Handle Enter key in checklist items
    this.richEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const checklistItem = range.startContainer.closest
            ? range.startContainer.closest('.checklist-item')
            : range.startContainer.parentElement?.closest('.checklist-item');

          if (checklistItem) {
            e.preventDefault();

            // Create a new paragraph after the checklist
            const newParagraph = document.createElement('p');
            newParagraph.innerHTML = '<br>';

            const checklist = checklistItem.closest('.checklist');
            checklist.parentNode.insertBefore(newParagraph, checklist.nextSibling);

            // Move cursor to the new paragraph
            const newRange = document.createRange();
            newRange.setStart(newParagraph, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);

            this.trackContentChanges();
          }
        }
      }
    });

    // Selection change for the entire document
    document.addEventListener('selectionchange', () => {
      if (document.activeElement === this.richEditor) {
        this.captureEditorSelection();
        this.updateFormatPanelFromSelection();
      }
    });

    // Title input
    this.noteTitle.addEventListener('input', () => {
      this.updateCurrentDate();
      this.trackContentChanges();
    });

  // History button opens history modal (instead of clicking date)
  this.historyBtn = document.getElementById('historyBtn');
  this.historyBtn?.addEventListener('click', () => this.openNoteHistory());

    // History modal close handlers
    this.closeHistoryModal?.addEventListener('click', () => this.hideModal(this.noteHistoryModal));
    this.historyCloseBtn?.addEventListener('click', () => this.hideModal(this.noteHistoryModal));

    this.noteTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.richEditor.focus();
      }
    });

    // Formatting toolbar
    this.setupFormattingToolbar();

    // Mood and weather selectors
    this.setupMoodWeatherSelectors();

    // Tags
    this.tagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addTag(e.target.value.trim());
        e.target.value = '';
      }
    });

    // Modal events
    this.setupModalEvents();

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Auto-save
    this.setupAutoSave();

    // Listen for native notification clicks forwarded from the main process
    try {
      if (window.electronAPI && typeof window.electronAPI.onNativeNotificationClick === 'function') {
        window.electronAPI.onNativeNotificationClick((notificationId) => {
          try {
            const nid = parseInt(notificationId);
            if (!Number.isNaN(nid)) {
              this.markNotificationAsRead(nid);
            }
            this.showNotificationsScreen();
          } catch (e) {
            console.warn('Native notification click handler error', e);
            this.showNotificationsScreen();
          }
        });
      }
    } catch (e) {
      // ignore if bridge not available
    }

    // Checkbox listeners
    this.setupCheckboxListeners();
  }

  testNativeNotification() {
    // Simple in-app notification + store
    const title = '🔔 Test Bildirimi';
    const body = 'Bu bir test bildirimidir.';
  const nid = this.addNotification(null, title, body);
  this.showNotification(title, 'info', { notificationId: nid });

    // Fire native notification if preference enabled
    try {
      const nativePref = this.toggleNativeNotifications ? this.toggleNativeNotifications.checked : (localStorage.getItem('settings.nativeNotifications') === null ? true : (localStorage.getItem('settings.nativeNotifications') === '1' || localStorage.getItem('settings.nativeNotifications') === 'true'));
      if (nativePref && window && window.electronAPI && typeof window.electronAPI.showNativeNotification === 'function') {
        window.electronAPI.showNativeNotification({
          title,
          body,
          silent: false
        }).catch(err => console.warn('showNativeNotification rejected:', err));
      }
    } catch (err) {
      console.warn('Native notification test error:', err);
    }
  }

  handleTestNotificationClick() {
    if (!this.testNativeNotifBtn) return;
    // Prevent rapid repeated clicks: disable for 3 seconds
    if (this._testNotifCooldown) return;
    this._testNotifCooldown = true;
    this.testNativeNotifBtn.disabled = true;
    // visually indicate disabled state (button styles handle disabled)
    try {
      this.testNativeNotification();
    } catch (err) {
      console.warn('Error firing test notification', err);
    }
    setTimeout(() => {
      this.testNativeNotifBtn.disabled = false;
      this._testNotifCooldown = false;
    }, 3000);
  }

  insertCodeBlock() {
    // Insert a fenced code block at the current caret/selection in the appropriate editor.
    // Empty fenced block - caret will be placed inside the empty code area
    const fenceTemplate = "```language\n\n```\n";

    // If markdown editor is visible, insert into textarea at cursor
    if (this.markdownEditor && !this.markdownEditor.classList.contains('hidden')) {
      this.insertAtCursor(this.markdownEditor, fenceTemplate);
      // update preview if visible
      if (this.markdownPreview && !this.markdownPreview.classList.contains('hidden')) {
        this.renderMarkdownPreview(this.markdownEditor.value);
      }
      this.markdownEditor.focus();
      this.trackContentChanges();
      return;
    }

    // Otherwise, insert into rich contenteditable as a <pre><code> block
    if (this.richEditor) {
      this.insertPreCodeForRichEditor();
      this.trackContentChanges();
      return;
    }
  }

  insertAtCursor(textarea, text) {
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const value = textarea.value || '';
    const before = value.substring(0, start);
    const after = value.substring(end);
    textarea.value = before + text + after;

    // If inserting a fenced code block, position caret inside the code area
    if (text.startsWith('```')) {
      // find position after the first newline following the opening fence
      const firstNewline = text.indexOf('\n');
      // place caret at the beginning of the code area (after the opening fence line)
      const caretPos = before.length + (firstNewline >= 0 ? firstNewline + 1 : 0);
      textarea.selectionStart = textarea.selectionEnd = caretPos;
    } else {
      // default: place caret at end of inserted text
      const caret = before.length + text.length;
      textarea.selectionStart = textarea.selectionEnd = caret;
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  insertPreCodeForRichEditor() {
    try {
      const sel = window.getSelection();
      const createPreWithZW = () => {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        const textNode = document.createTextNode('\u200B');
        code.appendChild(textNode);
        pre.appendChild(code);
        return { pre, code, textNode };
      };

      if (!sel || !sel.rangeCount) {
        // append at the end
        const { pre, textNode } = createPreWithZW();
        this.richEditor.appendChild(pre);
        try {
          const newSel = window.getSelection();
          const range = document.createRange();
          range.setStart(textNode, 1);
          range.collapse(true);
          newSel.removeAllRanges();
          newSel.addRange(range);
          this.richEditor.focus();
        } catch (err) {}
        return;
      }

      const range = sel.getRangeAt(0);

      // determine if selection is inside an existing <pre> or <code>
      const commonNode = range.commonAncestorContainer;
      const elementNode = commonNode.nodeType === Node.ELEMENT_NODE ? commonNode : commonNode.parentElement;
      const ancestor = elementNode && elementNode.closest ? elementNode.closest('pre, code') : null;

      if (ancestor) {
        // If we are inside a <code> or <pre>, insert the new block after the containing <pre>
        let preAncestor = ancestor.tagName && ancestor.tagName.toLowerCase() === 'pre' ? ancestor : (ancestor.closest ? ancestor.closest('pre') : null);
        if (!preAncestor) preAncestor = ancestor.parentElement;

        const { pre, textNode } = createPreWithZW();
        if (preAncestor && preAncestor.parentNode) {
          if (preAncestor.nextSibling) preAncestor.parentNode.insertBefore(pre, preAncestor.nextSibling);
          else preAncestor.parentNode.appendChild(pre);
        } else {
          // fallback: insert at current range
          range.deleteContents();
          range.insertNode(pre);
        }

        try {
          const newSel = window.getSelection();
          const newRange = document.createRange();
          newRange.setStart(textNode, 1);
          newRange.collapse(true);
          newSel.removeAllRanges();
          newSel.addRange(newRange);
          this.richEditor.focus();
        } catch (err) {}

        return;
      }

      // Default: insert at the current range location
      const { pre, textNode } = createPreWithZW();
      range.deleteContents();
      range.insertNode(pre);
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.setStart(textNode, 1);
      newRange.collapse(true);
      sel.addRange(newRange);
      try { this.richEditor.focus(); } catch (e) {}
    } catch (e) {
      // fallback: append
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      const textNode = document.createTextNode('\u200B');
      code.appendChild(textNode);
      pre.appendChild(code);
      this.richEditor.appendChild(pre);
      try {
        const sel2 = window.getSelection();
        const range2 = document.createRange();
        range2.setStart(textNode, 1);
        range2.collapse(true);
        sel2.removeAllRanges();
        sel2.addRange(range2);
        this.richEditor.focus();
      } catch (err) {}
    }
  }

  setupFormattingToolbar() {
    // Text color
    this.textColor.addEventListener('change', (e) => {
      this.applyFormat('color', e.target.value);
    });

    // Background color
    this.bgColor.addEventListener('change', (e) => {
      this.applyFormat('backgroundColor', e.target.value);
    });

    // Format buttons
    document.querySelectorAll('.format-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const format = e.target.closest('button').dataset.format;
        const align = e.target.closest('button').dataset.align;

        if (format) {
          this.toggleFormat(format);
        } else if (align) {
          this.applyAlignment(align);
        }
      });
    });

    // Insert buttons
    document
      .getElementById('insertDate')
      .addEventListener('click', () => this.insertDateTime('date'));
    document
      .getElementById('insertTime')
      .addEventListener('click', () => this.insertDateTime('time'));

    // Emoji panel toggle
    if (this.openEmojiBtn) this.openEmojiBtn.addEventListener('click', (e) => this.toggleEmojiPanel());
    // Browse image button opens hidden file input
    if (this.browseImageBtn && this.browseImageInput) {
      this.browseImageBtn.addEventListener('click', () => this.browseImageInput.click());
      this.browseImageInput.addEventListener('change', async (e) => {
        const files = e.target.files || [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          try {
            const saved = await window.electronAPI.saveDroppedFile(f.path || f.name);
            if (!saved) continue;
            this.insertImageAtSelection(saved, f.name);
            this.trackContentChanges();
          } catch (err) {
            console.error('Failed to save browsed image', err);
          }
        }
        // reset input so same file can be selected again
        e.target.value = '';
      });
    }

    // Reminder event listeners
    if (this.remindersNav) {
      this.remindersNav.addEventListener('click', () => this.showRemindersScreen());
    }
    if (this.setReminderBtn) {
      this.setReminderBtn.addEventListener('click', () => this.addReminder());
    }

    // Notifications event listeners
    if (this.notificationsNav) {
      this.notificationsNav.addEventListener('click', () => this.showNotificationsScreen());
    }

    // Mark all as read button
    if (this.markAllReadBtn) {
      this.markAllReadBtn.addEventListener('click', () => this.markAllNotificationsRead());
    }

    // Sidebar toggle
    this.toggleSidebarBtn.addEventListener('click', () => this.toggleEditorSidebar());

    // List buttons
    document.getElementById('insertList').addEventListener('click', () => this.insertList('ul'));
    document
      .getElementById('insertChecklist')
      .addEventListener('click', () => this.insertChecklist());
    document
      .getElementById('insertNumberedList')
      .addEventListener('click', () => this.insertList('ol'));
  }

  

  setupMoodWeatherSelectors() {
    this.moodBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.selectMood(e.target.dataset.mood);
        this.trackContentChanges(); // Track changes for save button
      });
    });

    this.weatherBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.selectWeather(e.target.dataset.weather);
        this.trackContentChanges(); // Track changes for save button
      });
    });

  // Emoji panel handlers: search and populate grid
  if (this.emojiSearchInput) this.emojiSearchInput.addEventListener('input', (e) => this.filterEmojiGrid(e.target.value));
  // initialize tabs then populate grid
  try { this.initEmojiTabs(); } catch (e) {}
  this.populateEmojiGrid();
  }

  toggleEmojiPanel() {
    if (!this.emojiPanel) return;
    if (this.emojiPanel.classList.contains('hidden')) {
      // capture the current editor selection so we can restore it after the panel steals focus
      try {
        this.captureEditorSelection();
      } catch (err) {
        // ignore capture errors
      }
      // Temporarily make visible (but not yet shown) so we can measure size
      this.emojiPanel.classList.remove('hidden');
      // remove show class to keep initial transform/opacity state
      this.emojiPanel.classList.remove('show');

      // allow layout to update
      requestAnimationFrame(() => {
        if (this.openEmojiBtn) {
          const btnRect = this.openEmojiBtn.getBoundingClientRect();
          const panelRect = this.emojiPanel.getBoundingClientRect();
          // compute left so panel centers under button when possible
          let left = Math.round(btnRect.left + btnRect.width / 2 - panelRect.width / 2);
          // clamp to viewport
          const minLeft = 4;
          const maxLeft = window.innerWidth - panelRect.width - 4;
          left = Math.max(minLeft, Math.min(maxLeft, left));
          this.emojiPanel.style.left = left + 'px';
          // flush: top edge slightly below button bottom for breathing room
          const verticalNudge = 10; // px
          this.emojiPanel.style.top = (Math.round(btnRect.bottom) + verticalNudge) + 'px';
          this.emojiPanel.style.right = 'auto';
        }

        // show with animation
        requestAnimationFrame(() => {
          this.emojiPanel.classList.add('show');
          setTimeout(() => this.emojiSearchInput && this.emojiSearchInput.focus(), 100);
          if (this.openEmojiBtn) this.openEmojiBtn.classList.add('active');
        });
      });
    } else {
      this.emojiPanel.classList.remove('show');
      // wait for animation then hide
      setTimeout(() => this.emojiPanel.classList.add('hidden'), 160);
      if (this.openEmojiBtn) this.openEmojiBtn.classList.remove('active');
    }
  }

  hideEmojiPanel() {
    if (!this.emojiPanel) return;
    this.emojiPanel.classList.remove('show');
    setTimeout(() => this.emojiPanel.classList.add('hidden'), 160);
    // clear inline positioning after hide
    setTimeout(() => {
      if (this.emojiPanel) {
        this.emojiPanel.style.left = '';
        this.emojiPanel.style.top = '';
      }
      // clear any saved selection when the panel is closed explicitly
      try { this.clearSavedSelection(); } catch (e) {}
    }, 200);
    if (this.openEmojiBtn) this.openEmojiBtn.classList.remove('active');
  }

  populateEmojiGrid() {
    if (!this.emojiGrid) return;
    const category = this.activeEmojiCategory || 'all';
    // larger categorized emoji dataset (ZWJ-containing sequences will be stripped later)
    const emojiSets = this._emojiSets || {
      all: [],
      smileys: [
        '😀','😃','😄','😁','😆','😅','😂','🤣','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','😐','😑','😶','😏','😒','🙄','🤨','🤔','🤫','🤭','🤥','😳','😞','😟','😠','😡','🤬','😔','😕','🙁','☹️','😭','😢','😤','😩','😫','😮','😯','😲','😱','😨','😰','🥵','🥶','😳','🤯','🥴','😵','🤐','🥺','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','🤡','💩','😺','😸','😹','😻','😼','😽','🙀','😿','😾',
        /* commonly expected basics */
        '😎','🤓','🤖','🙌','🤲'
      ],
      people: [
        '👶','🧒','👦','👧','🧑','👨','👩','👱','👱‍♀️','👱‍♂️','🧔','👨‍🦰','👩‍🦰','👨‍🦱','👩‍🦱','👨‍🦳','👩‍🦳','🧑‍⚕️','👩‍⚕️','👨‍⚕️','👩‍🏫','👨‍🏫','👩‍⚖️','👨‍⚖️','👩‍💼','👨‍💼','👩‍🔧','👨‍🔧','👩‍🔬','👨‍🔬','👩‍🎨','👨‍🎨','👩‍🚒','👨‍🚒','👮','👷','💂','🕵️','🧕','👳','🤵','👰','🤰','🤱','👩‍🍼','👨‍🍼'
      ],
      animals: [
        '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐒','🐔','🐤','🐥','🐣','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🪲','🪳','🐢','🐍','🦎','🐙','🦑','🦐','🦀'
      ],
      food: [
        '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🍞','🥖','🥨','🧀','🥚','🍳','🥓','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🌮','🌯','🥗','🍝','🍜','🍲','🍛','🍣','🍱','🍤','🍙','🍚','🍘','🍥','🥟','🧁','🍰','🎂','🍮','🍩','🍪','🍫','🍬','🍭'
      ],
      activities: [
        '⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥅','🏒','🏑','🥍','🏏','⛳','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🏂','🏋️','🏋️‍♀️','🏇','🏄','🚣','🏊','🤺','🤸','🤼','🤾'
      ],
      travel: [
        '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚲','🛴','🛵','🏍️','🚨','🚔','🚖','🚘','🚍','✈️','🛩️','🚀','🛸','🚁','🚤','🛳️','⛵','🚢','🚂','🚆','🚈','🚅','🚊'
      ],
      objects: [
        '⌚','📱','📲','💻','🖥️','🖨️','⌨️','🖱️','🖲️','🕹️','🧭','📷','📸','📹','🎥','📺','📻','🎙️','🎧','📡','🔋','🔌','💡','🔦','🧯','🛠️','🔧','🔨','🔩','⚙️','🧰','🧲','🪛','🔍','🧪','🧫','🧬'
      ],
      symbols: [
        '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','✨','⭐','⚡','🔥','💥','🌟','💫','💤','🔔','🔕','✔️','❌','❗','❓','⚠️','🔞','🔅','🔆','➕','➖','➗','✖️','♻️','⚕️','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓',
        /* reaction/gesture basics */
        '👍','👎','👏','🙏','💪','🤝'
      ],
      flags: [
        '🏳️','🏴','🏳️‍🌈','🇦🇺','🇧🇷','🇨🇦','🇨🇳','🇫🇷','🇩🇪','🇮🇳','🇮🇹','🇯🇵','🇰🇷','🇲🇽','🇳🇱','🇳🇿','🇳🇴','🇵🇱','🇵🇹','🇷🇺','🇸🇪','🇿🇦','🇹🇷','🇬🇧','🇺🇸'
      ]
    };
    // remove any emoji sequences that contain ZERO WIDTH JOINER U+200D (these often render as multiple glyphs in some fonts)
    Object.keys(emojiSets).forEach((k) => {
      emojiSets[k] = (emojiSets[k] || []).filter((ch) => typeof ch === 'string' && ch.indexOf('\u200D') === -1 && ch.indexOf('\u200d') === -1);
      // also dedupe
      emojiSets[k] = Array.from(new Set(emojiSets[k]));
    });
    // build 'all' set once
    if (!this._emojiSets) {
      const all = [];
      Object.keys(emojiSets).forEach((k) => {
        if (k === 'all') return;
        all.push(...emojiSets[k]);
      });
      emojiSets.all = Array.from(new Set(all));
      this._emojiSets = emojiSets;
    }

    // Build a simple English keyword map for each emoji.
    // Start with a few explicit keywords for commonly searched items, then
    // fall back to the category name so every emoji has at least one English keyword.
    try {
      // Build a consistent emoji -> array-of-english-keywords map once
      this._emojiKeywordMap = this._buildEnglishEmojiKeywordMap();
    } catch (e) {
      console.warn('Failed to initialize emoji keyword map:', e);
      this._emojiKeywordMap = this._emojiKeywordMap || {};
    }

    const emojis = Array.from((this._emojiSets[category] || this._emojiSets.all || []));
    // dedupe to ensure a stable order and no duplicates
    try {
      const uniq = Array.from(new Set(emojis));
      emojis.length = 0; emojis.push(...uniq);
    } catch (e) {
      // ignore any unexpected errors while normalizing the list
    }
    this.emojiGrid.innerHTML = '';
    emojis.forEach((emoji) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-grid-btn';
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        // restore the saved editor selection (if any) before inserting so the emoji goes into the editor
        try {
          if (this.savedSelection) {
            this.restoreEditorSelection();
          }
        } catch (err) {
          // ignore restore errors
        }
        // make sure editor has focus before insertion
        try { this.richEditor && this.richEditor.focus(); } catch (e) {}

        this.insertTextAtCursor(emoji);
        this.trackContentChanges();

        // update savedSelection to the new caret position after insertion so subsequent clicks insert at the updated spot
        try { this.captureEditorSelection(); } catch (e) {}

        // NOTE: Do NOT hide the panel here. The panel should only close when the user presses the close button.
      });
      this.emojiGrid.appendChild(btn);
    });
  }

  // initialize emoji tabs and category switching
  initEmojiTabs() {
    if (!this.emojiPanel) return;
    const tabs = Array.from(this.emojiPanel.querySelectorAll('.emoji-tab'));
    const tabsContainer = this.emojiPanel.querySelector('.emoji-tabs');
    // Add drag-to-scroll functionality to the tabs container (mouse & touch)
    if (tabsContainer) {
      let isDown = false;
      let startX;
      let scrollLeftStart;

      tabsContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        tabsContainer.classList.add('dragging');
        startX = e.pageX - tabsContainer.offsetLeft;
        scrollLeftStart = tabsContainer.scrollLeft;
        // prevent text selection while dragging
        e.preventDefault();
      });
      document.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        tabsContainer.classList.remove('dragging');
      });
      document.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const x = e.pageX - tabsContainer.offsetLeft;
        const walk = (x - startX) * 1; // scroll-fast multiplier
        tabsContainer.scrollLeft = scrollLeftStart - walk;
      });

      // touch support
      tabsContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].pageX - tabsContainer.offsetLeft;
        scrollLeftStart = tabsContainer.scrollLeft;
      }, { passive: true });
      tabsContainer.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1) return;
        const x = e.touches[0].pageX - tabsContainer.offsetLeft;
        const walk = (x - startX) * 1;
        tabsContainer.scrollLeft = scrollLeftStart - walk;
      }, { passive: true });
    }
    tabs.forEach((t) => {
      t.addEventListener('click', (e) => {
        const cat = t.dataset.category || 'all';
        // toggle aria-selected and active
        tabs.forEach((tb) => {
          tb.classList.remove('active');
          tb.setAttribute('aria-selected', 'false');
        });
        t.classList.add('active');
        t.setAttribute('aria-selected', 'true');
        this.activeEmojiCategory = cat;
        this.populateEmojiGrid();
        // refocus search input
        setTimeout(() => { try { this.emojiSearchInput && this.emojiSearchInput.focus(); } catch (e) {} }, 50);
      });
    });
  }

  filterEmojiGrid(query) {
    if (!this.emojiGrid) return;
  const q = this.normalizeForSearch(query || '');
  // Ensure english-only emoji keyword map exists
  if (!this._emojiKeywordMap) this._emojiKeywordMap = this._buildEnglishEmojiKeywordMap();
  const emojiKeywordMap = this._emojiKeywordMap || {};
    Array.from(this.emojiGrid.children).forEach((btn) => {
      const emoji = (btn.textContent || '').trim();
      if (!q) {
        btn.style.display = '';
        return;
      }
      // If the user pasted the emoji character itself, allow that match
      const charMatch = emoji.includes(q);
      // Match against our english keyword map
      let engMatch = false;
      const engKeywords = (emojiKeywordMap[emoji] || []);
      for (let i = 0; i < engKeywords.length; i++) {
        const kw = this.normalizeForSearch(String(engKeywords[i] || ''));
        if (!kw) continue;
        if (kw.indexOf(q) !== -1 || q.indexOf(kw) !== -1) { engMatch = true; break; }
      }
      btn.style.display = (charMatch || engMatch) ? '' : 'none';
    });
  }

  setupModalEvents() {
    // Confirm modal
    this.confirmBtn.addEventListener('click', () => {
      if (this.confirmCallback) {
        this.confirmCallback();
      }
      this.hideModal(this.confirmModal);
    });

    this.cancelBtn.addEventListener('click', () => {
      this.hideModal(this.confirmModal);
    });

    // Export modal
    document.querySelectorAll('.export-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.exportNote(e.target.closest('button').dataset.type);
        this.hideModal(this.exportModal);
      });
    });

    // Settings modal
    this.darkModeToggle.addEventListener('change', (e) => {
      this.toggleDarkMode(e.target.checked);
    });

    if (this.importNotesBtn) this.importNotesBtn.addEventListener('click', () => { this.importNotes(); });
    if (this.exportAllNotesBtn) this.exportAllNotesBtn.addEventListener('click', () => { this.exportAllNotes(); });

    // New combined import/export handlers
    if (this.exportAllDataBtn) this.exportAllDataBtn.addEventListener('click', () => this.exportAllData());
    if (this.importAllDataBtn) this.importAllDataBtn.addEventListener('click', () => this.importAllData());
  // Table modal events
  if (this.insertTableBtn) this.insertTableBtn.addEventListener('click', () => this.showModal(this.tableModal));
  if (this.closeTableModal) this.closeTableModal.addEventListener('click', () => this.hideModal(this.tableModal));
  if (this.cancelTableBtn) this.cancelTableBtn.addEventListener('click', () => this.hideModal(this.tableModal));
  if (this.insertTableConfirmBtn) this.insertTableConfirmBtn.addEventListener('click', () => this.handleInsertTable());
    // Clear actions
    this.clearAllNotesBtn?.addEventListener('click', () => this.confirmClearAllNotes());
    this.clearAllFoldersBtn?.addEventListener('click', () => this.confirmClearAllFolders());
    this.clearAllContentBtn?.addEventListener('click', () => this.confirmClearAllContent());
  // legacy settings export/import handlers removed (merged into Verileri İçe/Dışa Aktar)

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        // Settings modal için anında kapatma
        if (modal.id === 'settingsModal') {
          modal.classList.remove('show');
          modal.classList.add('hidden');
        } else {
          this.hideModal(modal);
        }
      });
    });

    // Click outside to close
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          // Settings modal için anında kapatma
          if (modal.id === 'settingsModal') {
            modal.classList.remove('show');
            modal.classList.add('hidden');
          } else {
            this.hideModal(modal);
          }
        }
      });
    });

    // Password modal events
    this.confirmPasswordBtn.addEventListener('click', () => this.handlePasswordConfirm());
    this.cancelPasswordBtn.addEventListener('click', () => this.hidePasswordModal());
    this.closePasswordModal.addEventListener('click', () => this.hidePasswordModal());
    this.passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handlePasswordConfirm();
      }
    });

    // Notifications will auto-hide after a few seconds
  }

  confirmClearAllNotes() {
    this.showConfirm('Tüm notları kalıcı olarak silmek istiyor musunuz? Bu işlem geri alınamaz.', async () => {
      await this.clearAllNotes();
    });
  }

  confirmClearAllFolders() {
    this.showConfirm('Tüm klasörleri kalıcı olarak silmek istiyor musunuz? Notların klasör ilişkileri kaldırılacaktır.', async () => {
      await this.clearAllFolders();
    });
  }

  confirmClearAllContent() {
    this.showConfirm('Uygulamayı sıfırlamak istiyor musunuz? (Notlar, klasörler ve ayarlar varsayılanlara dönecek). Bu işlem geri alınamaz.', async () => {
      await this.clearAllContent();
    });
  }

  async clearAllNotes() {
    try {
      // Collect existing note IDs to remove associated reminders/notifications
      const removedNoteIds = (this.notes || []).map(n => n.id);
      const removedNoteIdSet = new Set(removedNoteIds.map(id => String(id)));

      this.notes = [];
      await this.saveNotes();

      // Remove reminders and notifications that reference removed notes
      try {
        if (Array.isArray(this.reminders) && this.reminders.length > 0) {
          this.reminders = this.reminders.filter(r => {
            if (!r.noteId && r.noteId !== 0) return true;
            return !removedNoteIdSet.has(String(r.noteId));
          });
          await this.saveReminders();
          this.updateRemindersView();
        }
      } catch (e) {
        console.warn('Failed to cleanup reminders after clearing notes', e);
      }

      try {
        if (Array.isArray(this.notifications) && this.notifications.length > 0) {
          this.notifications = this.notifications.filter(n => {
            if (!n.noteId && n.noteId !== 0) return true;
            return !removedNoteIdSet.has(String(n.noteId));
          });
          await this.saveNotifications();
          this.updateNotificationsView();
        }
      } catch (e) {
        console.warn('Failed to cleanup notifications after clearing notes', e);
      }
      // Clear last viewed note
      try { localStorage.removeItem('last-viewed-note'); } catch (e) {}
      this.updateNotesList();
      this.updateFoldersList();
  // Update counters for reminders/notifications
  try { this.updateActiveRemindersCount(); } catch (e) {}
  try { this.updateActiveNotificationsCount(); } catch (e) {}
  this.updateStats();
      this.showNotification(window.i18n.t('messages.allNotesDeleted'), 'success');
    } catch (err) {
      console.error('Tüm notlar silinirken hata:', err);
      this.showNotification(window.i18n.t('messages.notesDeleteError'), 'error');
    }
  }

  async clearAllFolders() {
    try {
  // Delete all notes that belong to any real folder (treat 'default' as folderless)
  // Some notes use folderId === 'default' to mean no folder; only consider notes
  // that have a truthy folderId and are not 'default' as belonging to a folder.
  const notesInFolders = (this.notes || []).filter(n => n.folderId && n.folderId !== 'default');
  const removedNoteIdSet = new Set(notesInFolders.map(n => String(n.id)));

  // Keep only notes that are folderless (either falsy folderId or 'default')
  this.notes = (this.notes || []).filter(n => !n.folderId || n.folderId === 'default');
      this.folders = [];

      // Persist notes/folders
      await this.saveNotes();
      await this.saveFolders();

      // Remove reminders and notifications that reference removed notes
      try {
        if (Array.isArray(this.reminders) && this.reminders.length > 0) {
          this.reminders = this.reminders.filter(r => {
            if (!r.noteId && r.noteId !== 0) return true;
            return !removedNoteIdSet.has(String(r.noteId));
          });
          await this.saveReminders();
          this.updateRemindersView();
        }
      } catch (e) {
        console.warn('Failed to cleanup reminders after clearing folders', e);
      }

      try {
        if (Array.isArray(this.notifications) && this.notifications.length > 0) {
          this.notifications = this.notifications.filter(n => {
            if (!n.noteId && n.noteId !== 0) return true;
            return !removedNoteIdSet.has(String(n.noteId));
          });
          await this.saveNotifications();
          this.updateNotificationsView();
        }
      } catch (e) {
        console.warn('Failed to cleanup notifications after clearing folders', e);
      }

      this.updateNotesList();
      this.updateFoldersList();
  try { this.updateActiveRemindersCount(); } catch (e) {}
  try { this.updateActiveNotificationsCount(); } catch (e) {}
  // Ensure stats are refreshed (total notes / words / active days)
  try { this.updateStats(); } catch (e) {}
  this.showNotification(window.i18n.t('messages.allFoldersDeleted'), 'success');
    } catch (err) {
      console.error('Tüm klasörler silinirken hata:', err);
      this.showNotification(window.i18n.t('messages.foldersDeleteError'), 'error');
    }
  }

  async clearAllContent() {
    try {
      // Reset application data
      this.notes = [];
      this.folders = [];
      // Clear reminders and notifications as part of full reset
      this.reminders = [];
      this.notifications = [];

      // Remove stored data keys
      try { localStorage.removeItem('capnote-notes'); } catch (e) {}
      try { localStorage.removeItem('capnote-folders'); } catch (e) {}
      try { localStorage.removeItem('last-viewed-note'); } catch (e) {}

      // Reset settings to defaults by removing known keys
      try { localStorage.removeItem('capnote-settings'); } catch (e) {}
      try { localStorage.removeItem('accentColor'); } catch (e) {}
      try { localStorage.removeItem('darkMode'); } catch (e) {}
      try { localStorage.removeItem('maxPinnedNotes'); } catch (e) {}
      try { localStorage.removeItem('syncFolderAccent'); } catch (e) {}
      try { localStorage.removeItem('folderColorsBackup'); } catch (e) {}

      // Persist empty notes/folders
      await this.saveNotes();
      await this.saveFolders();
  // Persist clearing reminders/notifications
  try { await this.saveReminders(); } catch (e) { console.warn(e); }
  try { await this.saveNotifications(); } catch (e) { console.warn(e); }

      // Reset in-memory settings/state to defaults
      // Default accent used elsewhere in the app
      const defaultAccent = '#f59e0b';
      // Apply default accent visually (do not persist since we removed storage)
      this.setAccentColor(defaultAccent, { persist: false });

      // Reset theme to light/default
      this.applyTheme(false);
      if (this.darkModeToggle) this.darkModeToggle.checked = false;

      // Reset max pinned to default (3)
      try { localStorage.setItem('maxPinnedNotes', '3'); } catch (e) {}
      if (this.maxPinnedSelect) this.maxPinnedSelect.value = '3';

      // Disable folder-accent sync
      try { localStorage.setItem('syncFolderAccent', '0'); } catch (e) {}
      if (this.syncFolderAccentToggle) this.syncFolderAccentToggle.checked = false;
      // Restore folder accents from backup removal (ensure folders list is empty anyway)
      try { localStorage.removeItem('folderColorsBackup'); } catch (e) {}

      // Persist settings that the UI expects to exist
      this.saveSettings();

      // Refresh UI
      this.updateNotesList();
      this.updateFoldersList();
      this.updateFolderNotes();
    this.updateRemindersView();
    this.updateNotificationsView();
    try { this.updateActiveRemindersCount(); } catch (e) {}
    try { this.updateActiveNotificationsCount(); } catch (e) {}
    this.updateStats();

      // Ensure no note remains open after reset
      try {
        this.currentNote = null;
        this.currentNoteContent = '';
        this.lastSavedContent = '';
      } catch (e) {}

      // Show welcome/home screen instead of any note
      try { this.showWelcome(); } catch (e) {}

      this.showNotification(window.i18n.t('messages.appReset'), 'success');
    } catch (err) {
      console.error('Tüm içerik silinirken hata:', err);
      this.showNotification(window.i18n.t('messages.resetError'), 'error');
    }
  }

  showPasswordModal(title, message = '') {
    // Clear existing content
    this.passwordModalTitle.innerHTML = '';
    // Create icon element (Font Awesome) — not an emoji
    const icon = document.createElement('i');
    icon.className = 'fas fa-lock modal-title-icon';
    icon.setAttribute('aria-hidden', 'true');
    // Append icon then the plain text title (avoid injecting HTML from title)
    this.passwordModalTitle.appendChild(icon);
    this.passwordModalTitle.appendChild(document.createTextNode(' ' + title));
    if (message) {
      this.passwordMessage.textContent = message;
      this.passwordMessage.style.display = 'block';
    } else {
      this.passwordMessage.style.display = 'none';
    }
    this.passwordInput.value = '';
    this.passwordModal.classList.remove('hidden');

    // Focus input after a short delay to ensure modal is visible
    setTimeout(() => {
      this.passwordInput.focus();
    }, 100);

    return new Promise((resolve) => {
      this.passwordModalResolve = resolve;
    });
  }

  hidePasswordModal() {
    this.passwordModal.classList.add('hidden');
    if (this.passwordModalResolve) {
      this.passwordModalResolve(null);
      this.passwordModalResolve = null;
    }
  }

  handlePasswordConfirm() {
    const password = this.passwordInput.value;
    if (password === '') {
      this.showNotification(window.i18n.t('messages.enterPassword'), 'warning');
      return;
    }

    if (this.passwordModalResolve) {
      this.passwordModalResolve(password);
      this.passwordModalResolve = null;
    }
    this.passwordModal.classList.add('hidden');
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            this.createNewNote();
            break;
          case 's':
            e.preventDefault();
            if (this.currentNote) {
              this.saveNote();
            }
            break;
          case 'f':
            e.preventDefault();
            this.searchInput.focus();
            break;
          case 'e':
            e.preventDefault();
            if (this.currentNote) {
              this.editCurrentNote();
            }
            break;
          case 'd':
            e.preventDefault();
            if (this.currentNote) {
              this.duplicateNote();
            }
            break;
        }
      }

      if (e.key === 'Escape') {
        this.cancelEdit();
        this.hideAllModals();
      }
    });
  }

  setupAutoSave() {
    let autoSaveTimer;

    const triggerAutoSave = () => {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        if (this.currentNote && this.noteEditor && !this.noteEditor.classList.contains('hidden')) {
          this.saveNote(true); // Silent save
        }
      }, 2000);
    };

    this.richEditor.addEventListener('input', triggerAutoSave);
    this.noteTitle.addEventListener('input', triggerAutoSave);
  }

  setupCheckboxListeners() {
    // Function to handle checkbox changes
    const handleCheckboxChange = (e, isViewer = false) => {
      if (e.target && e.target.type === 'checkbox') {
        if (!this.currentNote) return;

        setTimeout(() => {
          if (isViewer) {
            // If change happened in viewer, sync to editor first
            this.richEditor.innerHTML = this.viewerText.innerHTML;

            // Copy checkbox states manually from viewer to editor
            const viewerCheckboxes = this.viewerText.querySelectorAll('input[type="checkbox"]');
            const editorCheckboxes = this.richEditor.querySelectorAll('input[type="checkbox"]');

            viewerCheckboxes.forEach((viewerCb, index) => {
              if (editorCheckboxes[index]) {
                editorCheckboxes[index].checked = viewerCb.checked;
              }
            });
          }

          // Sync and save from editor
          this.syncCheckboxStates();

          const title = isViewer
            ? this.currentNote.title
            : this.noteTitle.value.trim() || 'Başlıksız Not';
          const content = this.richEditor.innerHTML;

          this.currentNote.title = title;
          this.currentNote.content = content;
          this.currentNote.updatedAt = new Date().toISOString();

          // Update in notes array
          const existingIndex = this.notes.findIndex((note) => note.id === this.currentNote.id);
          if (existingIndex >= 0) {
            this.notes[existingIndex] = { ...this.currentNote };
          }

          // Save to storage
          this.saveNotes();

          // Update viewer if change was from editor
          if (!isViewer) {
            this.viewerText.innerHTML = this.richEditor.innerHTML;
            this.restoreCheckboxStatesInViewer();
          }
        }, 50);
      }
    };

    // Use event delegation for dynamically added checkboxes in editor
    this.richEditor.addEventListener('change', (e) => handleCheckboxChange(e, false));
    this.richEditor.addEventListener('click', (e) => {
      if (e.target && e.target.type === 'checkbox') {
        setTimeout(() => handleCheckboxChange(e, false), 10);
      }
    });

    // Use event delegation for checkboxes in viewer
    this.viewerText.addEventListener('change', (e) => handleCheckboxChange(e, true));
    this.viewerText.addEventListener('click', (e) => {
      if (e.target && e.target.type === 'checkbox') {
        setTimeout(() => handleCheckboxChange(e, true), 10);
      }
    });
  }

  async loadNotes() {
    try {
  const savedNotes = localStorage.getItem('capnote-notes');
  this.notes = savedNotes ? JSON.parse(savedNotes) : [];

      // Eski notlarda eksik property'leri ekle
      this.notes.forEach((note) => {
        if (note.isLocked === undefined) {
          note.isLocked = false;
        }
        if (note.folderId === undefined) {
          note.folderId = null;
        }
        if (!note.formatting) {
          note.formatting = this.getDefaultFormatting();
        } else {
          note.formatting = {
            fontFamily: note.formatting.fontFamily || this.defaultFormatting.fontFamily,
            fontSize: note.formatting.fontSize || this.defaultFormatting.fontSize,
          };
        }
      });

      // Notları tarih sırasına göre sırala
      this.notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Notlar yüklenirken hata:', error);
      this.notes = [];
    }

    // Klasörleri yükle
    await this.loadFolders();
  }

  async loadFolders() {
    try {
  const savedFolders = localStorage.getItem('capnote-folders');
  this.folders = savedFolders ? JSON.parse(savedFolders) : [];
  // Ensure older saved folders get a default expanded flag (true)
  this.folders = this.folders.map((f) => ({ expanded: f.expanded !== undefined ? f.expanded : true, ...f }));
    } catch (error) {
      console.error('Klasörler yüklenirken hata:', error);
      this.folders = [];
    }
  }

  async saveNotes() {
    try {
  localStorage.setItem('capnote-notes', JSON.stringify(this.notes));
      // Ensure overview stats reflect the latest notes immediately
      try { this.updateStats(); } catch (e) {}
    } catch (error) {
      console.error('Notlar kaydedilirken hata:', error);
      this.showNotification(window.i18n.t('messages.notesSaveError'), 'error');
    }
  }

  async saveFolders() {
    try {
  localStorage.setItem('capnote-folders', JSON.stringify(this.folders));
    } catch (error) {
      console.error('Klasörler kaydedilirken hata:', error);
      this.showNotification(window.i18n.t('messages.foldersSaveError'), 'error');
    }
  }

  async loadReminders() {
    try {
      const savedReminders = localStorage.getItem('capnote-reminders');
      this.reminders = savedReminders ? JSON.parse(savedReminders) : [];
      // Normalize reminders: ensure recurrence field exists
      this.reminders = this.reminders.map(r => ({
        ...r,
        recurrence: r.recurrence || 'none',
        recurrenceDays: Array.isArray(r.recurrenceDays) ? r.recurrenceDays : (r.recurrenceDays ? r.recurrenceDays : []),
        dismissed: r.dismissed || false
      }));
      // Filter out dismissed reminders and expired ones
      this.reminders = this.reminders.filter(r => !r.dismissed && new Date(r.datetime) > new Date());
      await this.saveReminders(); // Clean up storage
    } catch (error) {
      console.error('Hatırlatmalar yüklenirken hata:', error);
      this.reminders = [];
    }
  }

  _computeNextRecurrence(datetimeIso, recurrence) {
    try {
      const dt = new Date(datetimeIso);
      if (isNaN(dt)) return null;
      let next = new Date(dt.getTime());
      switch (recurrence) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          // Basic weekly increment will be handled by caller when recurrenceDays are provided.
          next.setDate(next.getDate() + 7);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
        default:
          return null;
      }
      return next;
    } catch (err) {
      console.warn('Failed to compute next recurrence', err);
      return null;
    }
  }

  _computeNextWeeklyFromDays(datetimeIso, daysArray) {
    try {
      const base = new Date(datetimeIso);
      if (isNaN(base)) return null;
      // Normalize daysArray to sorted unique numbers 0..6
      const days = Array.from(new Set((daysArray || []).map(d => parseInt(d)).filter(d => !isNaN(d) && d >= 0 && d <= 6))).sort((a,b) => a-b);
      if (days.length === 0) return null;

      // Start searching from the next minute to avoid returning the same moment
      const start = new Date(base.getTime() + 60000);
      for (let offset = 0; offset < 14; offset++) {
        const candidate = new Date(start.getTime());
        candidate.setDate(start.getDate() + offset);
        const wd = candidate.getDay();
        if (days.includes(wd)) {
          // Preserve the original time of day from base
          candidate.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
          // If candidate is still <= base (unlikely due to start shift), continue
          if (candidate.getTime() <= base.getTime()) continue;
          return candidate;
        }
      }
      // Fallback: compute by adding 7 days to base
      const fallback = new Date(base.getTime());
      fallback.setDate(fallback.getDate() + 7);
      return fallback;
    } catch (err) {
      console.warn('Failed to compute weekly next from days', err);
      return null;
    }
  }

  _recurrenceLabel(code) {
    switch (code) {
      case 'daily': return 'Günlük';
      case 'weekly': return 'Haftalık';
      case 'monthly': return 'Aylık';
      default: return '';
    }
  }

  _weekdayShort(n) {
    const map = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const idx = parseInt(n);
    if (isNaN(idx) || idx < 0 || idx > 6) return '';
    return map[idx];
  }

  async saveReminders() {
    try {
      localStorage.setItem('capnote-reminders', JSON.stringify(this.reminders));
    } catch (error) {
      console.error('Hatırlatmalar kaydedilirken hata:', error);
      this.showNotification(window.i18n.t('messages.remindersSaveError'), 'error');
    }
  }

  async loadNotifications() {
    try {
      const savedNotifications = localStorage.getItem('capnote-notifications');
      this.notifications = savedNotifications ? JSON.parse(savedNotifications) : [];
      // Sort by time, newest first
      this.notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
    } catch (error) {
      console.error('Bildirimler yüklenirken hata:', error);
      this.notifications = [];
    }
  }

  async saveNotifications() {
    try {
      localStorage.setItem('capnote-notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Bildirimler kaydedilirken hata:', error);
    }
  }

  saveLastViewedNote(noteId) {
    try {
      localStorage.setItem('last-viewed-note', noteId);
    } catch (error) {
      console.error('Son görüntülenen not kaydedilirken hata:', error);
    }
  }

  getLastViewedNote() {
    try {
      return localStorage.getItem('last-viewed-note');
    } catch (error) {
      console.error('Son görüntülenen not yüklenirken hata:', error);
      return null;
    }
  }

  loadLastViewedNote() {
    if (this.notes.length === 0) {
      this.showWelcome();
      return;
    }

    const lastViewedNoteId = this.getLastViewedNote();

    if (lastViewedNoteId && this.notes.length > 0) {
      // Find the note with the saved ID
      const lastNote = this.notes.find((note) => note.id == lastViewedNoteId);

      if (lastNote) {
        // Open the last viewed note
        this.openNote(lastNote);
        return;
      }
    }

    // If no last viewed note or note not found, open the first note
    if (this.notes.length > 0) {
      this.openNote(this.notes[0]);
    }
  }

  openNote(note) {
    // Auto-lock the current note if it was unlocked and is locked
    this.autoLockCurrentNote();

    this.currentNote = note;
    this.showViewer();
    this.displayNote(note);
    this.setActiveNoteInList(this.currentNote.id); // Only update active class
  }

  createNewNote() {
    // Auto-lock the current note if it was unlocked and is locked
    this.autoLockCurrentNote();

    this.currentNote = {
      id: Date.now(),
      title: '',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFavorite: false,
      mood: null,
      weather: null,
      tags: [],
      wordCount: 0,
      charCount: 0,
      isLocked: false,
      folderId: null,
      formatting: {
        ...this.getDefaultFormatting(),
        textAlign: 'left',
      },
    };

    // initialize history
    this.currentNote.history = [{ type: 'created', ts: this.currentNote.createdAt }];

    // Save last viewed note (new note)
    this.saveLastViewedNote(this.currentNote.id);

    this.showEditor();
    this.clearEditor();
    this.updateCurrentDate();
    this.noteTitle.focus();

    // Reset save button state for new note
    this.originalNoteState = this.getCurrentNoteContent();
    this.lastSavedContent = this.getCurrentNoteContent();
    this.isAutoSaved = false;
    this.updateSaveButtonState();

    // Update favorite button state for new unsaved note
    this.updateFavoriteButtons();
    // Renk inputlarını sabitle
    if (this.textColor) this.textColor.value = '#000000';
    if (this.bgColor) this.bgColor.value = '#ffffff';
  }

  showEditor() {
    this.welcomeScreen.classList.add('hidden');
    this.noteViewer.classList.add('hidden');
    this.noteEditor.classList.remove('hidden');
    this.remindersScreen?.classList.add('hidden');
    this.notificationsScreen?.classList.add('hidden');

    // Remove active from reminders and notifications
    this.remindersNav?.classList.remove('active');
    this.notificationsNav?.classList.remove('active');

    // Reset form
    this.resetFormState();
    // Ensure any previews are hidden when entering editor
    if (this.markdownPreview) this.hideMarkdownPreview();
    if (this.htmlPreview) {
      this.hideHtmlPreview();
      // clear iframe content if exists
      const iframe = this.htmlPreview.querySelector('iframe.preview-iframe');
      if (iframe) iframe.srcdoc = '';
      this.htmlPreview.innerHTML = '';
    }
  }

  showViewer() {
    this.welcomeScreen.classList.add('hidden');
    this.noteEditor.classList.add('hidden');
    this.noteViewer.classList.remove('hidden');
    this.remindersScreen?.classList.add('hidden');
    this.notificationsScreen?.classList.add('hidden');
    
    // Remove active from reminders and notifications
    this.remindersNav?.classList.remove('active');
    this.notificationsNav?.classList.remove('active');
    
    this.clearSavedSelection();
  }

  showWelcome() {
    this.noteEditor.classList.add('hidden');
    this.noteViewer.classList.add('hidden');
    this.welcomeScreen.classList.remove('hidden');
    this.remindersScreen?.classList.add('hidden');
    this.notificationsScreen?.classList.add('hidden');
    
    // Remove active from reminders and notifications
    this.remindersNav?.classList.remove('active');
    this.notificationsNav?.classList.remove('active');
    
    this.clearSavedSelection();
  }

  showRemindersScreen() {
    this.noteEditor.classList.add('hidden');
    this.noteViewer.classList.add('hidden');
    this.welcomeScreen.classList.add('hidden');
    this.notificationsScreen?.classList.add('hidden');
    this.remindersScreen?.classList.remove('hidden');
    
  // Update active states for reminders/notifications group only
  this.remindersNav?.classList.add('active');
  this.notificationsNav?.classList.remove('active');
    
    this.updateRemindersView();
  }

  showNotificationsScreen() {
    this.noteEditor.classList.add('hidden');
    this.noteViewer.classList.add('hidden');
    this.welcomeScreen.classList.add('hidden');
    this.remindersScreen?.classList.add('hidden');
    this.notificationsScreen?.classList.remove('hidden');
    
  // Update active states for reminders/notifications group only
  this.notificationsNav?.classList.add('active');
  this.remindersNav?.classList.remove('active');
    
    this.updateNotificationsView();
  }

  updateRemindersView() {
    if (!this.remindersList) return;
    
    const activeReminders = this.reminders.filter(r => !r.dismissed && new Date(r.datetime) > new Date());
    
    if (activeReminders.length === 0) {
      this.remindersList.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">${window.i18n.t('messages.noActiveReminders')}</div>`;
      return;
    }

    this.remindersList.innerHTML = activeReminders
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
      .map(r => `
        <div class="reminder-card" data-reminder-id="${r.id}">
          <div class="reminder-note-title">${this.escapeHtml(r.noteTitle)}</div>
          <div class="reminder-datetime">
            <i class="fas fa-clock"></i>
            ${new Date(r.datetime).toLocaleString('tr-TR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
            ${r.recurrence && r.recurrence !== 'none' ? `<span class="reminder-recurrence">${this._recurrenceLabel(r.recurrence)}${r.recurrence === 'weekly' && Array.isArray(r.recurrenceDays) && r.recurrenceDays.length ? (': ' + r.recurrenceDays.map(d => this._weekdayShort(d)).join(', ')) : ''}</span>` : ''}
          </div>
          <div class="reminder-actions">
            <button class="reminder-action-btn view-note-btn" data-note-id="${r.noteId}">
              <i class="fas fa-eye"></i> Notu Görüntüle
            </button>
            <button class="reminder-action-btn dismiss-btn" data-reminder-id="${r.id}">
              <i class="fas fa-check"></i> Tamamlandı
            </button>
          </div>
        </div>
      `).join('');

    // Add event listeners to action buttons
    this.remindersList.querySelectorAll('.view-note-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const noteId = parseInt(e.currentTarget.dataset.noteId);
        const note = this.notes.find(n => n.id === noteId);
        if (note) this.openNote(note);
      });
    });

    this.remindersList.querySelectorAll('.dismiss-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reminderId = parseInt(e.currentTarget.dataset.reminderId);
        this.dismissReminder(reminderId);
      });
    });
  }

  async addReminder() {
    if (!this.currentNote || !this.reminderDatetime?.value) {
      this.showNotification(window.i18n.t('messages.selectDateTime'), 'error');
      return;
    }

    // Check if note is saved (exists in notes array)
    const notExists = this.notes.some(n => n.id === this.currentNote.id);
    if (!notExists) {
      this.showNotification(window.i18n.t('messages.saveNoteFirst'), 'warning');
      return;
    }

    const datetime = this.reminderDatetime.value;
    const reminderDate = new Date(datetime);
    const now = new Date();

    if (reminderDate <= now) {
      this.showNotification(window.i18n.t('messages.futureDateRequired'), 'error');
      return;
    }

    const reminder = {
      id: Date.now(),
      noteId: this.currentNote.id,
      noteTitle: this.currentNote.title || 'Başlıksız Not',
      datetime: datetime,
      recurrence: (this.reminderRecurrence && this.reminderRecurrence.value) ? this.reminderRecurrence.value : 'none',
      dismissed: false,
      recurrenceDays: []
    };

    // If weekly recurrence selected, collect checked weekdays (0=Sun..6=Sat)
    if (reminder.recurrence === 'weekly') {
      try {
        const checkboxes = document.querySelectorAll('#reminderWeekdays .weekday-checkbox');
        const days = [];
        checkboxes.forEach(cb => {
          if (cb.checked) {
            const v = parseInt(cb.value);
            if (!isNaN(v)) days.push(v);
          }
        });
        // If user didn't pick any days, default to the weekday of the chosen date
        if (days.length === 0) {
          const d = new Date(datetime).getDay();
          days.push(d);
        }
        reminder.recurrenceDays = days.sort((a,b) => a - b);
      } catch (err) {
        // ignore
      }
    }

    this.reminders.push(reminder);
    await this.saveReminders();
    this.reminderDatetime.value = '';
    this.updateNoteRemindersDisplay();
    this.updateActiveRemindersCount();
    this.showNotification(window.i18n.t('messages.reminderAdded'), 'success');
  }

  async dismissReminder(reminderId) {
    const reminder = this.reminders.find(r => r.id === reminderId);
    if (reminder) {
      reminder.dismissed = true;
      await this.saveReminders();
      this.updateRemindersView();
      this.updateNoteRemindersDisplay();
      this.updateActiveRemindersCount();
      this.showNotification(window.i18n.t('messages.reminderCompleted'), 'success');
    }
  }

  updateNoteRemindersDisplay() {
    if (!this.noteRemindersList || !this.currentNote) return;

    const noteReminders = this.reminders.filter(r => 
      r.noteId === this.currentNote.id && 
      !r.dismissed && 
      new Date(r.datetime) > new Date()
    );

    if (noteReminders.length === 0) {
      this.noteRemindersList.innerHTML = `<div class="note-no-reminder">${window.i18n.t('stats.noReminder')}</div>`;
      return;
    }

    this.noteRemindersList.innerHTML = noteReminders
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
      .map(r => `
        <div class="note-reminder-item">
          <div class="note-reminder-time">
              <i class="fas fa-bell"></i>
              ${new Date(r.datetime).toLocaleString('tr-TR', { 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
              ${r.recurrence && r.recurrence !== 'none' ? ` <span class="reminder-recurrence">${this._recurrenceLabel(r.recurrence)}${r.recurrence === 'weekly' && Array.isArray(r.recurrenceDays) && r.recurrenceDays.length ? (': ' + r.recurrenceDays.map(d => this._weekdayShort(d)).join(', ')) : ''}</span>` : ''}
          </div>
          <button class="note-reminder-remove" data-reminder-id="${r.id}" title="Sil">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `).join('');

    // Add remove event listeners
    this.noteRemindersList.querySelectorAll('.note-reminder-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reminderId = parseInt(e.currentTarget.dataset.reminderId);
        this.removeReminder(reminderId);
      });
    });
  }

  async removeReminder(reminderId) {
    this.reminders = this.reminders.filter(r => r.id !== reminderId);
    await this.saveReminders();
    this.updateNoteRemindersDisplay();
    this.updateActiveRemindersCount();
    this.showNotification(window.i18n.t('messages.reminderDeleted'), 'info');
  }

  updateActiveRemindersCount() {
    if (!this.activeRemindersCount) return;
    const count = this.reminders.filter(r => !r.dismissed && new Date(r.datetime) > new Date()).length;
    this.activeRemindersCount.textContent = `(${count})`;
  }

  startReminderChecker() {
    // Check every minute for due reminders
    setInterval(() => {
      const now = new Date();
      let hasNotification = false;

      this.reminders.forEach(reminder => {
        if (!reminder.dismissed && new Date(reminder.datetime) <= now) {
          // Add to notifications list and show a toast that references the notification id
          const nid = this.addNotification(
            reminder.noteId,
            reminder.noteTitle,
            `Hatırlatma zamanı geldi: ${new Date(reminder.datetime).toLocaleString('tr-TR')}`
          );
          this.showNotification(`${window.i18n.t('messages.reminderPrefix')} ${reminder.noteTitle}`, 'info', { notificationId: nid });

          // Also trigger a native OS notification via the preload bridge if the user enabled it
          try {
            const nativePref = this.toggleNativeNotifications ? this.toggleNativeNotifications.checked : (localStorage.getItem('settings.nativeNotifications') === null ? true : (localStorage.getItem('settings.nativeNotifications') === '1' || localStorage.getItem('settings.nativeNotifications') === 'true'));
            if (nativePref && window && window.electronAPI && typeof window.electronAPI.showNativeNotification === 'function') {
              window.electronAPI.showNativeNotification({
                title: `⏰ Hatırlatma: ${reminder.noteTitle}`,
                body: `Hatırlatma zamanı geldi: ${new Date(reminder.datetime).toLocaleString('tr-TR')}`,
                silent: false
              }).catch(err => console.warn('showNativeNotification rejected:', err));
            }
          } catch (err) {
            // Keep app functional if native notification call fails
            console.warn('Native notification error:', err);
          }

          // If reminder has recurrence, compute next occurrence instead of dismissing
          if (reminder.recurrence && reminder.recurrence !== 'none') {
            // Handle weekly recurrences with specific weekdays
            if (reminder.recurrence === 'weekly' && Array.isArray(reminder.recurrenceDays) && reminder.recurrenceDays.length > 0) {
              const next = this._computeNextWeeklyFromDays(reminder.datetime, reminder.recurrenceDays);
              if (next) {
                reminder.datetime = next.toISOString();
              } else {
                reminder.dismissed = true;
              }
            } else {
              const next = this._computeNextRecurrence(reminder.datetime, reminder.recurrence);
              if (next) {
                reminder.datetime = next.toISOString();
              } else {
                reminder.dismissed = true;
              }
            }
          } else {
            reminder.dismissed = true;
          }

          hasNotification = true;
        }
      });

      if (hasNotification) {
        this.saveReminders();
        this.updateRemindersView();
        this.updateNoteRemindersDisplay();
        this.updateActiveRemindersCount();
        this.updateActiveNotificationsCount();
      }
    }, 60000); // Check every 60 seconds

    // Also update counts on init
    this.updateActiveRemindersCount();
    this.updateActiveNotificationsCount();
  }

  addNotification(noteId, noteTitle, message) {
    const notification = {
      id: Date.now(),
      noteId: noteId,
      noteTitle: noteTitle,
      message: message,
      time: new Date().toISOString(),
      read: false
    };
    this.notifications.unshift(notification); // Add to beginning
    this.saveNotifications();
    this.updateNotificationsView();
    this.updateActiveNotificationsCount();
    return notification.id;
  }

  updateNotificationsView() {
    if (!this.notificationsList) return;
    
    if (this.notifications.length === 0) {
      this.notificationsList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Henüz bildirim yok</div>';
      return;
    }

    this.notificationsList.innerHTML = this.notifications.map(n => `
      <div class="notification-card ${n.read ? '' : 'unread'}" data-notification-id="${n.id}">
        <div class="notification-header">
          <div class="notification-note-title">${this.escapeHtml(n.noteTitle)}</div>
          <div class="notification-time">
            <i class="fas fa-clock"></i>
            ${new Date(n.time).toLocaleString('tr-TR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
        <div class="notification-message">${this.escapeHtml(n.message)}</div>
        <div class="notification-actions">
          <button class="notification-action-btn view-notification-note-btn" data-note-id="${n.noteId}">
            <i class="fas fa-eye"></i> Görüntüle
          </button>
          ${!n.read ? `
            <button class="notification-action-btn mark-read-btn" data-notification-id="${n.id}">
              <i class="fas fa-check"></i> Okundu
            </button>
          ` : ''}
          <button class="notification-action-btn delete-notification-btn" data-notification-id="${n.id}">
            <i class="fas fa-trash"></i> Sil
          </button>
        </div>
      </div>
    `).join('');

    // Add event listeners
    this.notificationsList.querySelectorAll('.view-notification-note-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const noteId = parseInt(e.currentTarget.dataset.noteId);
        const note = this.notes.find(n => n.id === noteId);
        if (note) this.openNote(note);
      });
    });

    this.notificationsList.querySelectorAll('.mark-read-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const notificationId = parseInt(e.currentTarget.dataset.notificationId);
        this.markNotificationAsRead(notificationId);
      });
    });

    this.notificationsList.querySelectorAll('.delete-notification-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const notificationId = parseInt(e.currentTarget.dataset.notificationId);
        this.deleteNotification(notificationId);
      });
    });
  }

  markNotificationAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
      this.updateNotificationsView();
      this.updateActiveNotificationsCount();
    }
  }

  deleteNotification(notificationId) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.updateNotificationsView();
    this.updateActiveNotificationsCount();
  }

  updateActiveNotificationsCount() {
    if (!this.activeNotificationsCount) return;
    const count = this.notifications.filter(n => !n.read).length;
    this.activeNotificationsCount.textContent = `(${count})`;
    
    // Show/hide unread badge
    if (this.notificationsUnreadBadge) {
      if (count > 0) {
        this.notificationsUnreadBadge.style.display = 'inline-block';
      } else {
        this.notificationsUnreadBadge.style.display = 'none';
      }
    }
  }

  markAllNotificationsRead() {
    if (!this.notifications || this.notifications.length === 0) return;
    let changed = false;
    this.notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        changed = true;
      }
    });
    if (changed) {
      this.saveNotifications();
      this.updateNotificationsView();
      this.updateActiveNotificationsCount();
    }
  }

  clearEditor() {
    this.noteTitle.value = '';
    this.richEditor.innerHTML = '';
    if (this.markdownEditor) this.markdownEditor.value = '';
    // clear previews
    if (this.markdownPreview) this.hideMarkdownPreview();
    if (this.htmlPreview) {
      this.hideHtmlPreview();
      const iframe = this.htmlPreview.querySelector('iframe.preview-iframe');
      if (iframe) iframe.srcdoc = '';
      this.htmlPreview.innerHTML = '';
    }
  const baseFormatting = this.currentNote?.formatting || this.getDefaultFormatting();
    this.setEditorFormatting(baseFormatting);
    this.clearSavedSelection();
    this.clearMoodWeatherSelection();
    this.clearTags();
    this.updateWordCount();
  }

  resetFormState() {
    this.selectedMood = null;
    this.selectedWeather = null;
    this.tags = [];
    this.clearMoodWeatherSelection();
    this.clearTags();
    this.updateWordCount();
  }

  updateCurrentDate() {
    if (this.noteDate) {
      const now = new Date();
      const locale = window.i18n.currentLanguage === 'en' ? 'en-US' : 'tr-TR';
      this.noteDate.textContent = now.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  updateWordCount() {
    // Use innerText to preserve visible line breaks from the rich editor
    let text = (this.richEditor && this.richEditor.innerText) ? this.richEditor.innerText : (this.richEditor.textContent || '');
    // Normalize non-breaking spaces and other unicode spaces to regular spaces
    text = text.replace(/\u00A0/g, ' ');
    // Trim and collapse multiple whitespace (including newlines)
    const normalized = text.trim().replace(/\s+/g, ' ');
    // Use a Unicode-aware regex to match word tokens (letters/numbers). Some runtimes
    // may not support \p{} escapes; provide a safe fallback.
    let words = 0;
    try {
      const matches = normalized.match(/[\p{L}\p{N}]+/gu);
      words = matches ? matches.length : 0;
    } catch (e) {
      // Fallback: split on whitespace (best effort)
      words = normalized ? normalized.split(' ').filter(Boolean).length : 0;
    }
    const chars = text.length;

    if (this.wordCount) {
      this.wordCount.textContent = `${words} ${window.i18n.t('stats.words')}`;
    }
    if (this.charCount) {
      this.charCount.textContent = `${chars} ${window.i18n.t('stats.characters')}`;
    }

    // Editor-side reading time estimate (baseline 200 WPM)
    const WPM = 200;
    const seconds = words ? Math.ceil((words / WPM) * 60) : 0;
    if (this.editorReadingTime) {
      if (!seconds) this.editorReadingTime.textContent = `0 ${window.i18n.t('stats.readingTime')}`;
      else if (seconds < 60) this.editorReadingTime.textContent = `~${seconds} ${window.i18n.t('stats.readingTimeSeconds')}`;
      else this.editorReadingTime.textContent = `~${Math.round(seconds / 60)} ${window.i18n.t('stats.readingTime')}`;
    }

    if (this.currentNote) {
      this.currentNote.wordCount = words;
      this.currentNote.charCount = chars;
    }
  }

  // Count words/chars from an HTML string (used when saving notes)
  countWordsAndCharsFromHtml(html) {
  const tmp = document.createElement('div');
  // Ensure adjacent tags and text-to-tag boundaries have separating spaces so innerText doesn't concatenate words
  let safeHtml = (html || '').replace(/></g, '> <');
  // Insert a space before a '<' if it's immediately preceded by a non-space and not already separated
  safeHtml = safeHtml.replace(/([^\s>])</g, '$1 <');
  tmp.innerHTML = safeHtml;
    // Use innerText to reflect visible text (preserves newlines)
    let text = tmp.innerText || tmp.textContent || '';
    text = text.replace(/\u00A0/g, ' ');
    const normalized = text.trim().replace(/\s+/g, ' ');
    let words = 0;
    try {
      const matches = normalized.match(/[\p{L}\p{N}]+/gu);
      words = matches ? matches.length : 0;
    } catch (e) {
      words = normalized ? normalized.split(' ').filter(Boolean).length : 0;
    }
    const chars = text.length;
    return { words, chars, text };
  }

  saveNote(silent = false) {
    if (!this.currentNote) return;

    // Sync checkbox states before saving
    this.syncCheckboxStates();

    const title = this.noteTitle.value.trim() || 'Başlıksız Not';
  // If markdown editor is visible, save raw markdown; otherwise save HTML from rich editor
  // If the markdown editor is visible (editing markdown), save raw markdown; otherwise save HTML from rich editor
  const isMarkdownMode = this.markdownEditor && !this.markdownEditor.classList.contains('hidden');
  const content = isMarkdownMode ? this.markdownEditor.value : this.richEditor.innerHTML;

    this.currentNote.title = title;
  this.currentNote.content = content;
  this.currentNote.isMarkdown = !!isMarkdownMode;
    const nowIso = new Date().toISOString();
    this.currentNote.updatedAt = nowIso;
    // Update UI lists to reflect changes. Keep it simple and robust.
    try {
  this.updateNotesList();
  this.updateFoldersList();
      if (this.currentNote && this.currentNote.id) {
        this.updateActionButtonStates(this.currentNote.id);
      }
    } catch (e) {
      // If anything goes wrong, ensure full refresh
      this.updateNotesList();
      this.updateFoldersList();
    }
    this.currentNote.mood = this.selectedMood;
    this.currentNote.weather = this.selectedWeather;
  // Ensure accurate word/char counts are stored (handle multiline and HTML)
  const counts = this.countWordsAndCharsFromHtml(content);
  this.currentNote.wordCount = counts.words;
  this.currentNote.charCount = counts.chars;
    this.currentNote.tags = [...this.tags];
  this.currentNote.formatting = this.getEditorFormatting();

    // Var olan notu güncelle veya yeni not ekle
    const existingIndex = this.notes.findIndex((note) => note.id === this.currentNote.id);
    if (existingIndex >= 0) {
      this.notes[existingIndex] = { ...this.currentNote };
    } else {
      this.notes.unshift(this.currentNote);
    }

    this.saveNotes();
    this.markAsSaved(); // Mark as saved to disable save button

    // Update favorite button state after saving
    this.updateFavoriteButtons();

    if (!silent) {
      this.showNotification(window.i18n.t('messages.noteSaved'), 'success');
      this.showViewer();
      this.displayNote(this.currentNote);
    }

    this.updateNotesList();
    this.updateStats();
  }

  editCurrentNote() {
    if (!this.currentNote) return;

    this.originalNoteState = {
      title: this.currentNote.title,
      content: this.currentNote.content,
      mood: this.currentNote.mood,
      weather: this.currentNote.weather,
      tags: [...(this.currentNote.tags || [])],
      formatting: { ...(this.currentNote.formatting || this.getDefaultFormatting()) },
    };

    // Save last viewed note when editing
    this.saveLastViewedNote(this.currentNote.id);

    this.showEditor();
    this.loadNoteInEditor(this.currentNote);
  }

  loadNoteInEditor(note) {
    this.clearSavedSelection();
    this.noteTitle.value = note.title;
    // Load either raw markdown or HTML depending on note.isMarkdown
    if (note.isMarkdown) {
      if (this.markdownEditor) {
        this.markdownEditor.value = note.content || '';
      }
      if (this.richEditor) {
        // Show rich editor as plain text fallback (hidden)
        this.richEditor.innerHTML = '';
      }
    } else {
      this.richEditor.innerHTML = note.content;
      // ensure any images in loaded content are wrapped and wired for resizing
      try { this.upgradeImagesInEditor(); } catch (e) {}
      if (this.markdownEditor) this.markdownEditor.value = '';
    }
    this.setEditorFormatting(note.formatting || this.getDefaultFormatting());

    // Restore checkbox states from HTML attributes
    this.restoreCheckboxStates();

    this.selectedMood = note.mood;
    this.selectedWeather = note.weather;
    this.tags = [...(note.tags || [])];

    this.updateMoodWeatherDisplay();
    this.updateTagsDisplay();
    this.updateWordCount();
    this.updateCurrentDate();
    this.updateNoteRemindersDisplay();

  // Reset save button state - note is loaded as-is, no changes yet
  this.lastSavedContent = this.getCurrentNoteContent();
    this.isAutoSaved = true;
    this.updateSaveButtonState();

    // Update favorite button state
    this.updateFavoriteButtons();
    // Hide preview by default when loading into editor
    this.hideMarkdownPreview();
    // Show appropriate editor (markdownEditor for markdown notes)
    if (note.isMarkdown) {
      this.showMarkdownEditor();
    } else {
      this.showRichEditor();
    }
  }

  // Ensure a given <img> element is wrapped in .img-wrap and has resize handlers
  ensureImageWrapper(img) {
    if (!img || !this.richEditor) return;
    let wrapper = img.parentElement;
    if (!wrapper || !wrapper.classList.contains('img-wrap')) {
      wrapper = document.createElement('span');
      wrapper.className = 'img-wrap';
      wrapper.contentEditable = 'false';
      img.replaceWith(wrapper);
      wrapper.appendChild(img);
    }
    // avoid wiring twice
    if (wrapper.dataset.resizeWired) return;
    wrapper.dataset.resizeWired = '1';

    // ensure handle exists
    let handle = wrapper.querySelector('.img-handle');
    if (!handle) {
      handle = document.createElement('span');
      handle.className = 'img-handle';
      wrapper.appendChild(handle);
    }

    // click to select
    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      Array.from(this.richEditor.querySelectorAll('.img-wrap.selected')).forEach((n) => n.classList.remove('selected'));
      wrapper.classList.add('selected');
    });

    // resize handling
    let isResizing = false;
    let startX = 0;
    let startW = 0;
    const imgEl = wrapper.querySelector('img');
    const onMouseMove = (ev) => {
      if (!isResizing) return;
      const dx = ev.clientX - startX;
      const newW = Math.max(24, startW + dx);
      if (imgEl) imgEl.style.width = newW + 'px';
    };
    const onMouseUp = () => {
      if (!isResizing) return;
      isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.trackContentChanges();
    };
    handle.addEventListener('mousedown', (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      isResizing = true;
      startX = ev.clientX;
      startW = imgEl ? imgEl.getBoundingClientRect().width : 0;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // ensure a single document click handler to deselect
    if (!this._imgDocListenerAdded) {
      this._imgDocListenerAdded = true;
      document.addEventListener('click', (e) => {
        if (!this.richEditor) return;
        Array.from(this.richEditor.querySelectorAll('.img-wrap.selected')).forEach((n) => {
          if (!n.contains(e.target)) n.classList.remove('selected');
        });
      });
    }
  }

  upgradeImagesInEditor() {
    if (!this.richEditor) return;
    const imgs = Array.from(this.richEditor.querySelectorAll('img'));
    imgs.forEach((img) => {
      try {
        // If the image is already wrapped (saved HTML may include .img-wrap),
        // unwrap it so we can create a fresh wrapper and attach listeners.
        const parent = img.parentElement;
        if (parent && parent.classList && parent.classList.contains('img-wrap')) {
          try {
            // Replace the wrapper with the raw img node so ensureImageWrapper creates a new wrapper
            parent.replaceWith(img);
          } catch (unwrapErr) {
            // fallback: try to move the img out
            try { parent.parentNode.insertBefore(img, parent); parent.remove(); } catch (e) {}
          }
        }
        this.ensureImageWrapper(img);
      } catch (e) {}
    });
  }

  showMarkdownPreview() {
    if (!this.markdownPreview) return;
    this.markdownPreview.classList.remove('hidden');
    this.toggleMarkdownBtn.classList.add('active');
    if (this.toggleHtmlBtn) this.toggleHtmlBtn.classList.remove('active');
  }

  hideMarkdownPreview() {
    if (!this.markdownPreview) return;
    this.markdownPreview.classList.add('hidden');
    this.toggleMarkdownBtn.classList.remove('active');
  }

  toggleMarkdownMode() {
    // Preview-only mode: render markdown from current editor content or currentNote
    if (!this.markdownPreview) return;
    // If HTML preview is open, close it so only one preview is active
    if (this.htmlPreview && !this.htmlPreview.classList.contains('hidden')) {
      this.hideHtmlPreview();
    }
    const isVisible = !this.markdownPreview.classList.contains('hidden');
    if (isVisible) {
      this.hideMarkdownPreview();
      // Restore previous editor visibility
      if (this.currentNote && this.currentNote.isMarkdown && this.markdownEditor) {
        this.showMarkdownEditor();
      } else {
        this.showRichEditor();
      }
    } else {
      // Get source text: prefer current rich editor text (so user edits immediately reflect preview)
      const sourceText = (this.markdownEditor && !this.markdownEditor.classList.contains('hidden'))
        ? this.markdownEditor.value
        : (this.richEditor && this.richEditor.innerText)
        ? this.richEditor.innerText
        : (this.currentNote && this.currentNote.content)
        ? this.currentNote.content
        : '';
      this.renderMarkdownPreview(sourceText);
      // Hide editors while showing preview
      this.hideRichEditor();
      this.hideMarkdownEditor();
      this.showMarkdownPreview();
    }
  }

  renderMarkdownPreview(source) {
    if (!this.markdownPreview) return;
    const md = String(source || '');
    try {
      // Prevent any raw HTML from being interpreted when rendering markdown preview.
      // We escape angle brackets so user HTML doesn't get rendered as HTML in the preview;
      // the preview should show markdown-derived output only.
      const escaped = md.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const html = (window.marked && marked.parse) ? marked.parse(escaped) : escaped;
      this.markdownPreview.innerHTML = html;
      // attach copy buttons to any code blocks in the preview
      this.attachCopyButtonsToPre(this.markdownPreview);
    } catch (e) {
      this.markdownPreview.textContent = md;
    }
  }

  // Attach a small copy button to every <pre> inside the given container
  attachCopyButtonsToPre(container) {
    if (!container) return;
    const pres = container.querySelectorAll('pre');
    pres.forEach((pre) => {
      // avoid duplicate buttons
      if (pre.querySelector('.code-copy-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.type = 'button';
      btn.title = 'Kodu kopyala';
      btn.innerHTML = '<i class="fas fa-copy"></i>';

      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = pre.innerText || pre.textContent || '';
        try {
          await navigator.clipboard.writeText(text);
          btn.classList.add('copied');
          btn.title = 'Kopyalandı';
          // show toast
          if (this.showNotification) this.showNotification('Kod panoya kopyalandı', 'success');
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.title = 'Kodu kopyala';
          }, 1200);
        } catch (err) {
          // fallback: select and execCommand
          try {
            const range = document.createRange();
            range.selectNodeContents(pre);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('copy');
            sel.removeAllRanges();
            btn.classList.add('copied');
            if (this.showNotification) this.showNotification(window.i18n.t('messages.codeCopied'), 'success');
            setTimeout(() => btn.classList.remove('copied'), 1200);
          } catch (e) {
            console.error('copy failed', e);
            if (this.showNotification) this.showNotification(window.i18n.t('messages.copyFailed'), 'error');
          }
        }
      });

      // Wrap pre in a relative container to position the button if necessary
      pre.style.position = pre.style.position || 'relative';
      pre.appendChild(btn);
    });
  }

  // HTML preview functions
  showHtmlPreview() {
    if (!this.htmlPreview) return;
    this.htmlPreview.classList.remove('hidden');
    if (this.toggleHtmlBtn) this.toggleHtmlBtn.classList.add('active');
    if (this.toggleMarkdownBtn) this.toggleMarkdownBtn.classList.remove('active');
  }

  hideHtmlPreview() {
    if (!this.htmlPreview) return;
    this.htmlPreview.classList.add('hidden');
    if (this.toggleHtmlBtn) this.toggleHtmlBtn.classList.remove('active');
  }

  toggleHtmlMode() {
    if (!this.htmlPreview) return;
    const isVisible = !this.htmlPreview.classList.contains('hidden');
    if (isVisible) {
      this.hideHtmlPreview();
      // restore editor
      if (this.currentNote && this.currentNote.isMarkdown && this.markdownEditor) this.showMarkdownEditor();
      else this.showRichEditor();
      return;
    }

    // Ensure markdown preview is hidden if open and deactivate its button
    if (this.markdownPreview && !this.markdownPreview.classList.contains('hidden')) {
      this.hideMarkdownPreview();
    }
    if (this.toggleMarkdownBtn) this.toggleMarkdownBtn.classList.remove('active');

    // Render raw HTML from current source: prefer markdownEditor (if editing markdown), else richEditor.innerHTML
    const sourceHtml = (this.markdownEditor && !this.markdownEditor.classList.contains('hidden'))
      ? this.markdownEditor.value
      : (this.richEditor ? this.richEditor.innerHTML : '');

    // If sourceHtml is Markdown (note.isMarkdown), render via marked then show raw HTML
    try {
      let htmlToShow = sourceHtml;
      if (this.currentNote && this.currentNote.isMarkdown) {
        // Prefer explicit HTML code fences: ```html
        const fenceMatch = sourceHtml.match(/```(?:html|HTML|htm)\s*\n([\s\S]*?)```/);
        if (fenceMatch) {
          htmlToShow = fenceMatch[1];
        } else {
          // Otherwise render the markdown to HTML
          htmlToShow = (window.marked && marked.parse) ? marked.parse(sourceHtml) : sourceHtml;
        }
      } else {
        // If rich editor content contains escaped HTML entities like &lt;div&gt;, unescape them
        const tmp = document.createElement('div');
        tmp.innerHTML = sourceHtml;
        const text = tmp.textContent || tmp.innerText || '';
        if (text.includes('<') && text.includes('>')) {
          htmlToShow = text;
        } else {
          htmlToShow = sourceHtml;
        }
      }

      // Create or reuse a sandboxed iframe to isolate user HTML/CSS from the parent app
      let iframe = this.htmlPreview.querySelector('iframe.preview-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.className = 'preview-iframe';
        // sandbox without allow-scripts to prevent script execution; keep it strict
        iframe.setAttribute('sandbox', '');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = '0';
        iframe.style.display = 'block';
        // ensure iframe occupies the container
        this.htmlPreview.innerHTML = '';
        this.htmlPreview.appendChild(iframe);
      }

      // Build srcdoc that ensures minimal reset so content renders correctly inside iframe
      const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<style>html,body{margin:0;padding:0;box-sizing:border-box;font-family:inherit;color:inherit;} img{max-width:100%;height:auto;}</style></head><body>${htmlToShow}</body></html>`;
      iframe.srcdoc = doc;
    } catch (e) {
      this.htmlPreview.textContent = sourceHtml;
    }

    // Hide editors while showing HTML preview
    this.hideRichEditor();
    this.hideMarkdownEditor();
    this.showHtmlPreview();
    // deactivate markdown button to make previews mutually exclusive
    if (this.toggleMarkdownBtn) this.toggleMarkdownBtn.classList.remove('active');
  }

  // Editor visibility helpers
  showMarkdownEditor() {
    if (!this.markdownEditor) return;
    this.markdownEditor.classList.remove('hidden');
    if (this.richEditor) this.richEditor.classList.add('hidden');
    this.toggleMarkdownBtn.classList.toggle('active', true);
  }

  hideMarkdownEditor() {
    if (!this.markdownEditor) return;
    this.markdownEditor.classList.add('hidden');
    this.toggleMarkdownBtn.classList.toggle('active', false);
  }

  showRichEditor() {
    if (this.richEditor) this.richEditor.classList.remove('hidden');
    if (this.markdownEditor) this.markdownEditor.classList.add('hidden');
    this.toggleMarkdownBtn.classList.toggle('active', false);
  }

  hideRichEditor() {
    if (this.richEditor) this.richEditor.classList.add('hidden');
  }

  restoreCheckboxStates() {
    // Sync checkbox properties from HTML attributes
    const checkboxes = this.richEditor.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      const shouldBeChecked = checkbox.hasAttribute('checked');
      checkbox.checked = shouldBeChecked;

      // Force visual update by re-setting the attribute
      if (shouldBeChecked) {
        checkbox.setAttribute('checked', 'checked');
      } else {
        checkbox.removeAttribute('checked');
      }

      // Also force a re-render by toggling a CSS property
      checkbox.style.accentColor = checkbox.style.accentColor || 'var(--primary-color)';
    });
  }

  restoreCheckboxStatesInViewer() {
    // Sync checkbox properties from HTML attributes in viewer
    const checkboxes = this.viewerText.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      const shouldBeChecked = checkbox.hasAttribute('checked');

      // Force immediate visual update
      checkbox.checked = shouldBeChecked;

      // Force DOM to re-render by cloning and replacing
      const newCheckbox = checkbox.cloneNode(true);
      newCheckbox.checked = shouldBeChecked;
      if (shouldBeChecked) {
        newCheckbox.setAttribute('checked', 'checked');
      } else {
        newCheckbox.removeAttribute('checked');
      }

      checkbox.parentNode.replaceChild(newCheckbox, checkbox);
    });
  }

  cancelEdit() {
    if (this.notes.length > 0) {
      this.showViewer();
      if (this.currentNote) {
        this.displayNote(this.currentNote);
      }
    } else {
      this.showWelcome();
      this.currentNote = null;
    }
  }

  deleteCurrentNote() {
    if (!this.currentNote) return;

    this.showConfirm(
      `"${this.currentNote.title}" ${window.i18n.t('messages.confirmDelete')}`,
      () => {
        this.notes = this.notes.filter((note) => note.id !== this.currentNote.id);
        this.saveNotes();
        this.updateNotesList();
        this.updateStats();
        this.showNotification(window.i18n.t('messages.noteDeleted'), 'success');

        if (this.notes.length > 0) {
          this.selectNote(this.notes[0]);
        } else {
          this.currentNote = null;
          this.showWelcome();
        }
      }
    );
  }

  duplicateNote() {
    if (!this.currentNote) return;

    const duplicate = {
      ...this.currentNote,
      id: Date.now(),
      title: this.currentNote.title + ' (Kopya)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false, // Kopyalanan not sabitlenmiş olmasın
      isLocked: false, // Kopyalanan not kilitli olmasın
      isFavorite: false, // Kopyalanan not favorilerde olmasın
    };

    this.notes.unshift(duplicate);
    this.saveNotes();
    this.updateNotesList();
    this.updateStats();
    this.showNotification(window.i18n.t('messages.noteCopied'), 'success');

    this.selectNote(duplicate);
  }

  // ...existing code...

  /**
   * Favori butonlarını günceller
   */
  updateFavoriteButtons() {
    const isFavorite = this.currentNote?.isFavorite;

    // Only update the favorite view button since favoriteBtn is only in viewer mode
    if (this.favoriteViewBtn) {
      const icon = this.favoriteViewBtn.querySelector('i');
      icon.className = isFavorite ? 'fas fa-heart' : 'far fa-heart';
      this.favoriteViewBtn.classList.toggle('favorited', isFavorite);
    }
  }

  selectNote(note) {
    // Auto-lock the current note if it was unlocked and is locked
    this.autoLockCurrentNote();

    // Check if note is locked
    if (note.isLocked && !note.isUnlocked) {
      this.unlockNoteForViewing(note);
      return;
    }

    this.currentNote = note;
    this.originalNoteState = {
      title: note.title,
      content: note.content,
      mood: note.mood,
      weather: note.weather,
      tags: [...(note.tags || [])],
      formatting: { ...(note.formatting || this.getDefaultFormatting()) },
    };

    // Save last viewed note
    this.saveLastViewedNote(note.id);

    // Show viewer mode and display note
    this.showViewer();
    this.displayNote(note);
    this.setActiveNoteInList(this.currentNote.id); // Only update active class
  }

  displayNote(note) {
    this.viewerTitle.textContent = note.title;

    // Check if note is locked and not temporarily unlocked
    if (note.isLocked && !note.isUnlocked) {
      this.viewerText.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-lock" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>${window.i18n.t('messages.noteIsLocked')}</h3>
                    <p>${window.i18n.t('messages.unlockFromList')}</p>
                </div>
            `;
    } else {
      if (note.isMarkdown) {
        try {
          this.viewerText.innerHTML = (window.marked && marked.parse) ? marked.parse(note.content || '') : (note.content || '');
        } catch (e) {
          this.viewerText.textContent = note.content || '';
        }
      } else {
        this.viewerText.innerHTML = note.content;
      }
    // Attach copy buttons to code blocks in the viewer
    this.attachCopyButtonsToPre(this.viewerText);
    }

    this.applyViewerFormatting(note.formatting);

    // Restore checkbox states in viewer
    this.restoreCheckboxStatesInViewer();

    // Save last viewed note
    this.saveLastViewedNote(note.id);

    // Tarih bilgisi
    const createdDate = new Date(note.createdAt);
    const updatedDate = new Date(note.updatedAt);
    const locale = window.i18n.currentLanguage === 'en' ? 'en-US' : 'tr-TR';
    this.viewerDate.textContent = createdDate.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Mood ve weather
    this.viewerMood.textContent = note.mood || '';
    this.viewerWeather.textContent = note.weather || '';

    // Tags
    this.displayViewerTags(note.tags || []);

  // Stats - compute from HTML content to avoid showing stale stored counts
  const counts = this.countWordsAndCharsFromHtml(note.content || '');
  // Update in-memory note counts so subsequent actions use the up-to-date value
  note.wordCount = counts.words;
  note.charCount = counts.chars;
  if (this.viewerWordCount) this.viewerWordCount.textContent = `${counts.words} ${window.i18n.t('stats.words')}`;
  if (this.viewerCharCount) this.viewerCharCount.textContent = `${counts.chars} ${window.i18n.t('stats.characters')}`;
  // Reading time calculation (baseline 200 words per minute)
  const WPM = 200;
  if (!counts.words) {
    this.readingTime.textContent = `0 ${window.i18n.t('stats.readingTime')}`;
  } else {
    const seconds = Math.ceil((counts.words / WPM) * 60);
    if (seconds < 60) {
      this.readingTime.textContent = `~${seconds} ${window.i18n.t('stats.readingTimeSeconds')}`;
    } else {
      const minutes = Math.round(seconds / 60);
      this.readingTime.textContent = `~${minutes} ${window.i18n.t('stats.readingTime')}`;
    }
  }
    // Show date + time for last modified (e.g. 12.10.2025 14:35)
    const locale2 = window.i18n.currentLanguage === 'en' ? 'en-US' : 'tr-TR';
    this.lastModified.textContent = updatedDate.toLocaleString(locale2, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    this.updateFavoriteButtons();
  }

  displayViewerTags(tags) {
    this.viewerTags.innerHTML = '';
    tags.forEach((tag) => {
      const tagElement = document.createElement('span');
      tagElement.className = 'viewer-tag';
      tagElement.textContent = tag;
      this.viewerTags.appendChild(tagElement);
    });
  }

  openNoteHistory() {
    if (!this.currentNote) return;
    const hist = this.currentNote.history || [];
    this.historyBody.innerHTML = '';

    // Show createdAt at the top
    const created = this.currentNote.createdAt ? new Date(this.currentNote.createdAt) : null;
    const locale = window.i18n.currentLanguage === 'en' ? 'en-US' : 'tr-TR';
    if (created) {
      const el = document.createElement('div');
      el.className = 'history-entry created';
      el.innerHTML = `<strong>${window.i18n.t('viewer.created')}</strong> ${created.toLocaleString(locale)}`;
      this.historyBody.appendChild(el);
    }

    // Render only non-created history entries (created is shown above)
    const updates = hist.filter((h) => h.type !== 'created');
    if (updates.length > 0) {
      const list = document.createElement('div');
      list.className = 'history-list';
      updates.forEach((h) => {
        const d = new Date(h.ts);
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<span class="history-type">${window.i18n.t('viewer.updated')}</span> <span class="history-ts">${d.toLocaleString(locale)}</span>`;
        list.appendChild(item);
      });
      this.historyBody.appendChild(list);
    } else {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = window.i18n.t('stats.noReminder');
      this.historyBody.appendChild(empty);
    }

    this.showModal(this.noteHistoryModal);
  }

  updateNotesList() {
    this.notesList.innerHTML = '';

    const filteredNotes = this.getFilteredNotes();
    const sortedNotes = this.getSortedNotes(filteredNotes);

  // Update nav count for visible notes (include folder-contained notes)
  const navCountEl = document.getElementById('navNotesCount');
  if (navCountEl) navCountEl.textContent = `(${this.getVisibleNotesCount()})`;

    sortedNotes.forEach((note) => {
      const noteElement = this.createNoteElement(note);
      this.notesList.appendChild(noteElement);
    });

    // Also update folder notes for custom folders
    this.updateFolderNotes();
  }

  // Update only the active state in existing DOM note lists without full re-render
  setActiveNoteInList(noteId) {
    // Clear previous active in main notes list
    const prevActive = this.notesList.querySelector('.note-item.active');
    if (prevActive && prevActive.getAttribute('data-note-id') != noteId) {
      prevActive.classList.remove('active');
    }

    // Set new active in main notes list
    const newActive = this.notesList.querySelector(`.note-item[data-note-id="${noteId}"]`);
    if (newActive) {
      newActive.classList.add('active');
    }

    // Also update any folder note lists
    document.querySelectorAll('.folder-notes-container[data-folder-id]').forEach((container) => {
      const folderId = container.getAttribute('data-folder-id');
      const prev = container.querySelector('.folder-note-item.active');
      if (prev && prev.getAttribute('data-note-id') != noteId) {
        prev.classList.remove('active');
      }
      const current = container.querySelector(`.folder-note-item[data-note-id="${noteId}"]`);
      if (current) {
        current.classList.add('active');
      }
    });

    // If folder item wasn't found (likely due to render timing), retry once on the next frame
    const foundInFolder = Array.from(document.querySelectorAll('.folder-notes-container[data-folder-id]')).some((container) =>
      !!container.querySelector(`.folder-note-item[data-note-id="${noteId}"]`)
    );
    if (!foundInFolder) {
      requestAnimationFrame(() => {
        document.querySelectorAll('.folder-notes-container[data-folder-id]').forEach((container) => {
          const folderId = container.getAttribute('data-folder-id');
          const current = container.querySelector(`.folder-note-item[data-note-id="${noteId}"]`);
          if (current) {
            current.classList.add('active');
          }
        });
      });

      // Also schedule a fallback after a short delay in case other async updates occur
      setTimeout(() => {
        document.querySelectorAll('.folder-notes-container[data-folder-id]').forEach((container) => {
          const folderId = container.getAttribute('data-folder-id');
          const current = container.querySelector(`.folder-note-item[data-note-id="${noteId}"]`);
          if (current) {
            current.classList.add('active');
          }
        });
      }, 50);
    }
  }

  updateFolderNotes() {
    // Update custom folder notes
    document.querySelectorAll('.folder-notes-container[data-folder-id]').forEach((container) => {
      const folderIdLog = container.getAttribute('data-folder-id');
      const folderId = container.getAttribute('data-folder-id');
      container.innerHTML = '';
      let folderNotes = this.notes.filter((note) => note.folderId == folderId);

      // Apply current filter to folder notes
      switch (this.currentFilter) {
        case 'today':
          const today = new Date().toDateString();
          folderNotes = folderNotes.filter(
            (note) => new Date(note.createdAt).toDateString() === today
          );
          break;
        case 'favorites':
          folderNotes = folderNotes.filter((note) => note.isFavorite);
          break;
        // default durumunda tüm klasör notlarını göster
      }

      // Apply search filter to folder notes
      // Apply search filter to folder notes (use centralized matching including mood/weather)
      const rawSearch = this.searchInput ? String(this.searchInput.value) : '';
      const searchTerm = this.normalizeForSearch(rawSearch);
      if (searchTerm) {
        // If folder name matches the search, include all folder notes (still respecting currentFilter applied above)
        const folderObj = this.folders.find((f) => f.id == folderId);
        const folderNameMatches = folderObj && this.normalizeForSearch(folderObj.name || '').includes(searchTerm);
        if (!folderNameMatches) {
          folderNotes = folderNotes.filter((note) => this.noteMatchesSearch(note, searchTerm));
        }
      }

      const sortedFolderNotes = this.getSortedNotes(folderNotes);
      sortedFolderNotes.forEach((note) => {
        const noteElement = this.createFolderNoteElement(note);
        container.appendChild(noteElement);
      });

  // Toggle visibility of the folder wrapper based on visible count / current filter/search
  const treatAsFilter = this.currentFilter !== 'all' || !!searchTerm;
  const visibleCount = this.getVisibleCountForFolder(folderId);
      const folderWrapper = container.closest('.folder-container');
      if (folderWrapper) {
        if (treatAsFilter && visibleCount === 0) {
          folderWrapper.style.display = 'none';
        } else {
          folderWrapper.style.display = '';
        }
      }
    });
  }

  getFilteredNotes() {
    let filtered = [...this.notes];

    // Filter by type
    switch (this.currentFilter) {
      case 'today':
        const today = new Date().toDateString();
        filtered = filtered.filter(
          (note) =>
            new Date(note.createdAt).toDateString() === today &&
            (!note.folderId || note.folderId === 'default')
        );
        break;
      case 'favorites':
        filtered = filtered.filter(
          (note) => note.isFavorite && (!note.folderId || note.folderId === 'default')
        );
        break;
      default:
        // Show only notes without folder (klasörsüz)
        filtered = filtered.filter((note) => !note.folderId || note.folderId === 'default');
        break;
    }

    // Search filter (include mood/weather keywords and emoji)
    const rawSearch = (this.searchInput && this.searchInput.value) ? String(this.searchInput.value) : '';
    const searchTerm = this.normalizeForSearch(rawSearch);
    if (searchTerm) {
      filtered = filtered.filter((note) => this.noteMatchesSearch(note, searchTerm));
    }

    return filtered;
  }

  // Compute how many notes match the current filter/search including notes inside folders
  getVisibleNotesCount() {
  const rawSearch = this.searchInput ? String(this.searchInput.value) : '';
  const searchTerm = this.normalizeForSearch(rawSearch);
    let matched = [...this.notes];

    switch (this.currentFilter) {
      case 'today':
        const today = new Date().toDateString();
        matched = matched.filter((note) => new Date(note.createdAt).toDateString() === today);
        break;
      case 'favorites':
        matched = matched.filter((note) => note.isFavorite);
        break;
      default:
        // no folder restriction here: include all notes for the default 'all' view
        matched = matched;
        break;
    }

    if (searchTerm) {
      matched = matched.filter((note) => this.noteMatchesSearch(note, searchTerm));
    }

    return matched.length;
  }

  // Normalize strings for search (lowercase, trim)
  normalizeForSearch(text) {
    return String(text || '').toLowerCase().trim();
  }

  // Map emoji to localized keywords to support text search for moods/weather
  // Build a single English-only emoji keyword map.
  // Each emoji maps to an array of English keywords (at least one). This is the
  // authoritative source used by emoji search and mood/weather note searching.
  _buildEnglishEmojiKeywordMap() {
    // Explicit mappings for common emojis. Keep keys as the emoji character.
    const explicit = {
      '😊': ['happy', 'smile'],
      '😢': ['sad', 'cry'],
      '😡': ['angry'],
      '😴': ['sleepy', 'tired'],
      '😍': ['love', 'heart'],
      '🤔': ['thinking', 'think'],
      '😎': ['cool', 'sunglasses'],
      '🙄': ['bored'],
      '👋': ['wave', 'hello', 'hi'],
      '🤚': ['hand', 'stop'],
      '✋': ['stop', 'hand'],
      '👌': ['ok', 'okay', 'perfect'],
      '👍': ['thumbs up', 'like', 'approve'],
      '👎': ['thumbs down', 'dislike'],
      '👏': ['clap', 'applause'],
      '🙏': ['pray', 'thanks', 'thank you'],
      '💪': ['strong', 'muscle'],
      '🤝': ['handshake', 'agree'],
      '🙌': ['celebrate', 'hooray'],
      '🤲': ['palms', 'open hands'],
      '🤓': ['nerd', 'geek'],
      '🤖': ['robot'],
      '😅': ['relieved', 'sweat'],
      '😂': ['laugh', 'lol'],
      '😭': ['crying', 'sob'],
      '😇': ['innocent', 'angel'],
      '😉': ['wink'],
      '😜': ['silly', 'tongue'],
      // weather and misc
      '☀️': ['sun', 'sunny'],
      '⛅': ['partly cloudy', 'partly'],
      '☁️': ['cloud', 'cloudy'],
      '🌧️': ['rain', 'rainy'],
      '⛈️': ['storm', 'thunderstorm'],
      '❄️': ['snow', 'snowy'],
      // flags (keep short and common keywords)
      '🇹🇷': ['turkey', 'tr'],
      '🇺🇸': ['usa', 'united states', 'us'],
      '🇬🇧': ['uk', 'united kingdom', 'britain'],
    };

    // For any emoji not explicitly listed, we'll fallback to the category name
    // during map construction so every emoji has at least one English keyword.
    const map = Object.assign({}, explicit);
    try {
      if (this._emojiSets) {
        Object.keys(this._emojiSets).forEach((cat) => {
          (this._emojiSets[cat] || []).forEach((emoji) => {
            if (!map[emoji]) {
              // Use the category name as a single-word fallback keyword
              map[emoji] = [String(cat).toLowerCase()];
            } else {
              // normalize explicit keywords: lowercase and dedupe
              const kws = Array.from(new Set((map[emoji] || []).map((k) => String(k || '').toLowerCase()).filter(Boolean)));
              map[emoji] = kws.length ? kws : [String(cat).toLowerCase()];
            }
          });
        });
      }
    } catch (e) {
      // If anything goes wrong, return explicit map only
      console.warn('Failed building full emoji keyword map:', e);
    }

    return map;
  }

  // Decide if a note matches searchTerm, including mood/weather keyword mapping
  noteMatchesSearch(note, searchTerm) {
    const title = this.normalizeForSearch(note.title || '');
    const content = this.normalizeForSearch(note.content || '');
    const tags = (note.tags || []).map((t) => this.normalizeForSearch(t));

    if (title.includes(searchTerm) || content.includes(searchTerm)) return true;
    if (tags.some((t) => t.includes(searchTerm))) return true;

    // mood and weather exact emoji match
    const mood = note.mood ? String(note.mood) : '';
    const weather = note.weather ? String(note.weather) : '';
    if (mood && mood.includes(searchTerm)) return true;
    if (weather && weather.includes(searchTerm)) return true;

    // check emoji keyword map (english-only) for mood/weather matches
    if (!this._emojiKeywordMap) this._emojiKeywordMap = this._buildEnglishEmojiKeywordMap();
    const ekm = this._emojiKeywordMap || {};
    for (const [emoji, keywords] of Object.entries(ekm)) {
      if (!Array.isArray(keywords)) continue;
      for (let i = 0; i < keywords.length; i++) {
        const kw = this.normalizeForSearch(String(keywords[i] || ''));
        if (!kw) continue;
        if (kw.indexOf(searchTerm) !== -1 || searchTerm.indexOf(kw) !== -1) {
          if (note.mood === emoji || note.weather === emoji) return true;
        }
      }
    }

    return false;
  }

  getSortedNotes(notes) {
    return notes.sort((a, b) => {
      // Always show pinned notes first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Then sort by selected criteria
      switch (this.currentSort) {
        case 'date-asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'date-desc':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'updated-asc':
          return new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt);
        case 'updated-desc':
          return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      }
    });
  }

  createNoteElement(note) {
    const div = document.createElement('div');
    div.className = 'note-item fade-in';
    div.draggable = true;
    div.setAttribute('data-note-id', note.id);

    if (this.currentNote && this.currentNote.id === note.id) {
      div.classList.add('active');
    }
    if (note.isPinned) {
      div.classList.add('pinned');
    }
    if (note.isLocked) {
      div.classList.add('locked');
    }

    div.innerHTML = `
            <i class="fas fa-file-alt nav-icon"></i>
            <span class="nav-text note-item-title">${this.escapeHtml(note.title)}</span>
            <div class="note-item-actions">
                <button class="note-action-btn favorite-btn ${note.isFavorite ? 'favorited' : ''}" 
                        data-note-id="${note.id}"
                        title="${note.isFavorite ? window.i18n.t('messages.removeFromFavorites') : window.i18n.t('messages.addToFavorites')}">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="note-action-btn pin-btn ${note.isPinned ? 'pinned' : ''}" 
                        data-note-id="${note.id}"
                        title="${note.isPinned ? window.i18n.t('messages.unpinNote') : window.i18n.t('messages.pinNote')}">
                    <i class="fas fa-thumbtack"></i>
                </button>
                <button class="note-action-btn lock-btn ${note.isLocked ? 'locked' : ''}" 
                        data-note-id="${note.id}"
                        title="${note.isLocked ? window.i18n.t('messages.unlockNote') : window.i18n.t('messages.lockNote')}">
                    <i class="fas fa-lock"></i>
                </button>
                <button class="note-action-btn delete-btn" 
                        data-note-id="${note.id}"
                        title="${window.i18n.t('messages.deleteNote')}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

    // Add event listener for note selection (not for action buttons)
    div.addEventListener('click', (e) => {
      // Only select note if it's not an action button
      if (!e.target.closest('.note-action-btn')) {
        this.selectNote(note);
      }
    });

    // Add action button event listeners
    const favoriteBtn = div.querySelector('.favorite-btn');
    const pinBtn = div.querySelector('.pin-btn');
    const lockBtn = div.querySelector('.lock-btn');
    const deleteBtn = div.querySelector('.delete-btn');

    favoriteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFavorite(note.id);
    });

    pinBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePin(note.id);
    });

    lockBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleLock(note.id);
    });

    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteNoteById(note.id);
    });

    // Add hover event listeners for title truncation
    const titleElement = div.querySelector('.note-item-title');
    const originalTitle = note.title;
    const truncatedTitle = note.title.length > 6 ? note.title.substring(0, 6) + '...' : note.title;

    div.addEventListener('mouseenter', () => {
      titleElement.textContent = truncatedTitle;
    });

    div.addEventListener('mouseleave', () => {
      titleElement.textContent = originalTitle;
    });

    // Add drag event listeners
    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', note.id);
      div.classList.add('dragging');
    });

    div.addEventListener('dragend', () => {
      div.classList.remove('dragging');
    });

    return div;
  }

  getTextPreview(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    const text = div.textContent || div.innerText || '';
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  searchNotes() {
    this.updateNotesList();
    // Rebuild folders so search results hide/show folders correctly
    this.updateFoldersList();
  }

  changeFilter(filter) {
    this.currentFilter = filter;

    // Update active tab
    this.filterTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.filter === filter);
    });

    this.updateNotesList();
  }

  changeSorting(sort) {
    this.currentSort = sort;
    this.updateNotesList();
  }

  setSortOrder(sort) {
    this.changeSorting(sort);
  }

  updateStats() {
    const totalNotesCount = this.notes.length;
    const totalWordsCount = this.notes.reduce((sum, note) => sum + (note.wordCount || 0), 0);

    // Calculate active days
    const uniqueDays = new Set(this.notes.map((note) => new Date(note.createdAt).toDateString()));
    const activeDaysCount = uniqueDays.size;

    if (this.totalNotes) this.totalNotes.textContent = totalNotesCount;
    if (this.daysActive) this.daysActive.textContent = activeDaysCount;
    if (this.totalWords) this.totalWords.textContent = totalWordsCount;
  }

  updateUI() {
    if (this.notes.length === 0) {
      this.showWelcome();
    } else {
      // Don't automatically open the first note here
      // Let loadLastViewedNote handle which note to open
      this.showViewer();
    }

    this.updateNotesList();
    this.updateFoldersList();
  }

  // Format methods
  applyFormat(command, value) {
    this.restoreEditorSelection();
    this.richEditor.focus();

    try {
      if (command === 'fontFamily') {
        document.execCommand('fontName', false, value);
      } else if (command === 'fontSize') {
        // Modern approach for font size
        this.applyFontSize(value);
      } else if (command === 'color') {
        document.execCommand('foreColor', false, value);
      } else if (command === 'backgroundColor') {
        document.execCommand('backColor', false, value);
      } else {
        document.execCommand(command, false, value);
      }
    } catch (e) {
      console.warn('Format command failed:', command, e);
    }

    this.updateFormatButtons();
    this.captureEditorSelection();
  }

  applyFontSize(sizeValue) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    try {
      // Create a span with the font size
      const span = document.createElement('span');
      span.style.fontSize = sizeValue;

      // Extract contents and wrap in span
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);

      // Restore selection
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.addRange(newRange);
    } catch {
      // Fallback to execCommand
      const sizeNum = parseInt(sizeValue);
      if (sizeNum <= 10) document.execCommand('fontSize', false, '1');
      else if (sizeNum <= 12) document.execCommand('fontSize', false, '2');
      else if (sizeNum <= 14) document.execCommand('fontSize', false, '3');
      else if (sizeNum <= 18) document.execCommand('fontSize', false, '4');
      else if (sizeNum <= 24) document.execCommand('fontSize', false, '5');
      else if (sizeNum <= 32) document.execCommand('fontSize', false, '6');
      else document.execCommand('fontSize', false, '7');
    }
  }

  toggleFormat(command) {
    this.restoreEditorSelection();
    this.richEditor.focus();
    document.execCommand(command);
    this.updateFormatButtons();
    this.captureEditorSelection();
  }

  applyAlignment(align) {
    this.restoreEditorSelection();
    this.richEditor.focus();
    try {
      if (align === 'justify') {
        // Some browsers expect 'justifyFull' for full justification
        document.execCommand('justifyFull');
      } else {
        document.execCommand('justify' + align.charAt(0).toUpperCase() + align.slice(1));
      }
    } catch (e) {
      // Fallback to execCommand('justify') for older engines
      try {
        document.execCommand('justify');
      } catch (err) {
        console.warn('Alignment command failed', err);
      }
    }
    this.captureEditorSelection();
    // Refresh format panel to ensure buttons reflect new state
    this.updateFormatPanelFromSelection();
  }

  updateFormatButtons() {
    document.querySelectorAll('.format-btn').forEach((btn) => {
      const format = btn.dataset.format;
      if (format) {
        const isActive = document.queryCommandState(format);
        btn.classList.toggle('active', isActive);
      }
    });
  }

  updateFormatPanelFromSelection() {
    // Editör boşsa inputları güncelleme
    if (!this.richEditor || !this.richEditor.innerText.trim()) return;
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;

    try {
      // Update format buttons
      this.updateFormatButtons();

      // Get the selected node or parent node
      const range = selection.getRangeAt(0);
      const node =
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentNode
          : range.commonAncestorContainer;

      // Update font family
      const fontFamily = window.getComputedStyle(node).fontFamily;
      if (this.fontFamilyDropdown && fontFamily) {
        // Clean up font family name
        const cleanFont = fontFamily.replace(/['"]/g, '').split(',')[0];
        this.updateCustomDropdown('fontFamily', cleanFont);
      }

      // Update font size
      const fontSize = window.getComputedStyle(node).fontSize;
      if (this.fontSizeDropdown && fontSize) {
        const sizeValue = parseInt(fontSize);
        this.updateCustomDropdown('fontSize', sizeValue.toString());
      }

      // Update text color and background color pickers based on selection
      try {
        const computedColor = window.getComputedStyle(node).color;
        // Update alignment buttons based on computed text alignment
        try {
          const textAlign = window.getComputedStyle(node).textAlign || 'left';
          document.querySelectorAll('.format-btn[data-align]').forEach((btn) => {
            const align = btn.dataset.align;
            btn.classList.toggle('active', align === textAlign);
          });
        } catch (e) {
          // ignore alignment update errors
        }

        // Walk up ancestors to find a visible (non-transparent) background
        let bgNode = node;
        let bgColor = null;
        while (bgNode && bgNode !== this.richEditor && bgNode !== document.documentElement) {
          const candidate = window.getComputedStyle(bgNode).backgroundColor;
          const hex = this.rgbToHex(candidate);
          if (hex) {
            bgColor = hex;
            break;
          }
          bgNode = bgNode.parentElement;
        }

        // If not found on ancestors, check editor background
        if (!bgColor) {
          const editorBg = window.getComputedStyle(this.richEditor).backgroundColor;
          bgColor = this.rgbToHex(editorBg) || '#ffffff';
        }

        const textHex = this.rgbToHex(computedColor) || '#000000';

        if (this.textColor && textHex) this.textColor.value = textHex;
        if (this.bgColor && bgColor) this.bgColor.value = bgColor;
      } catch (e) {
        // ignore if any issue reading computed styles
      }

      // ...existing code...
    } catch (e) {
      console.warn('Error updating format panel:', e);
    }
  }

  rgbToHex(rgb) {
    if (!rgb) return null;

    // Handle 'transparent'
    if (rgb === 'transparent') return null;

    // Match rgb() or rgba()
    const rgbaMatch = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/i);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1], 10);
      const g = parseInt(rgbaMatch[2], 10);
      const b = parseInt(rgbaMatch[3], 10);
      const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;

      // If fully transparent, return null so we can fallback to ancestor/bg
      if (a === 0) return null;

      return (
        '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
      ).toLowerCase();
    }

    // If already a hex color, normalize
    const hexMatch = rgb.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      let hex = rgb.toLowerCase();
      // Expand short form #rgb to #rrggbb
      if (hex.length === 4) {
        hex =
          '#' +
          hex[1] + hex[1] +
          hex[2] + hex[2] +
          hex[3] + hex[3];
      }
      return hex;
    }

    return null;
  }

  insertDateTime(type) {
    const now = new Date();
    let text;

    if (type === 'date') {
      text = now.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } else {
      text = now.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    this.insertTextAtCursor(text);
  }

  insertTextAtCursor(text) {
    document.execCommand('insertText', false, text);
    this.richEditor.focus();
  }

  handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');

    // If there's no selection or no richEditor, fallback to default insert
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      document.execCommand('insertText', false, text);
      this.trackContentChanges();
      return;
    }

    const range = sel.getRangeAt(0);
    // Check if we're pasting inside an existing <code> element
    const codeAncestor = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer.closest && range.startContainer.closest('code')
      : range.startContainer.parentElement && range.startContainer.parentElement.closest('code');

    if (codeAncestor) {
      // Insert the plaintext into the current text node inside <code> preserving newlines
      e.preventDefault();
      let node = range.startContainer;
      let offset = range.startOffset;
      if (node.nodeType !== Node.TEXT_NODE) {
        // prefer an existing text node child or create one
        if (node.childNodes[offset] && node.childNodes[offset].nodeType === Node.TEXT_NODE) {
          node = node.childNodes[offset];
          offset = 0;
        } else {
          node = document.createTextNode('');
          range.insertNode(node);
          offset = 0;
        }
      }
      const before = node.nodeValue ? node.nodeValue.substring(0, offset) : '';
      const after = node.nodeValue ? node.nodeValue.substring(offset) : '';
      node.nodeValue = before + text + after;
      // place caret after pasted text
      const newRange = document.createRange();
      newRange.setStart(node, (before.length + text.length));
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      this.trackContentChanges();
      return;
    }

    // Insert pasted text as plain text (preserve newlines). Do NOT auto-create <pre><code> blocks.
    // Only special-case pasting when inside an existing <code> (handled above).
    // Use execCommand insertText to preserve simple plaintext insertion behavior in contenteditable.
    document.execCommand('insertText', false, text);
    this.trackContentChanges();
  }

  // Mood and Weather methods
  selectMood(mood) {
    // Toggle mood - clear if same mood is clicked again
    if (this.selectedMood === mood) {
      this.selectedMood = null;
    } else {
      this.selectedMood = mood;
    }
    this.updateMoodWeatherDisplay();
  }

  selectWeather(weather) {
    // Toggle weather - clear if same weather is clicked again
    if (this.selectedWeather === weather) {
      this.selectedWeather = null;
    } else {
      this.selectedWeather = weather;
    }
    this.updateMoodWeatherDisplay();
  }

  updateMoodWeatherDisplay() {
    // Update mood buttons
    this.moodBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mood === this.selectedMood);
    });

    // Update weather buttons
    this.weatherBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.weather === this.selectedWeather);
    });
  }

  clearMoodWeatherSelection() {
    this.selectedMood = null;
    this.selectedWeather = null;
    this.updateMoodWeatherDisplay();
  }

  showMoodPicker() {
    // Implementation for mood picker modal
    this.showNotification(window.i18n.t('messages.useSidePanel'), 'info');
  }

  showWeatherPicker() {
    // Implementation for weather picker modal
    this.showNotification(window.i18n.t('messages.useWeatherPanel'), 'info');
  }

  // Tags methods
  addTag(tagText) {
    if (!tagText || this.tags.includes(tagText)) return;

    // Maksimum 5 etiket kontrolü
    if (this.tags.length >= 5) {
      this.showNotification(window.i18n.t('messages.maxTags'), 'warning');
      return;
    }

    this.tags.push(tagText);
    this.updateTagsDisplay();
    this.trackContentChanges(); // Track changes for save button
  }

  removeTag(tagText) {
    this.tags = this.tags.filter((tag) => tag !== tagText);
    this.updateTagsDisplay();
    this.trackContentChanges(); // Track changes for save button
  }

  updateTagsDisplay() {
    this.tagsList.innerHTML = '';
    this.tags.forEach((tag) => {
      const tagElement = document.createElement('span');
      tagElement.className = 'tag';
      tagElement.innerHTML = `
                ${this.escapeHtml(tag)}
                <button class="tag-remove" onclick="app.removeTag('${tag}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
      this.tagsList.appendChild(tagElement);
    });
  }

  clearTags() {
    this.tags = [];
    this.updateTagsDisplay();
  }

  // Export methods
  showExportModal() {
    this.showModal(this.exportModal);
  }

  exportNote(type) {
    if (!this.currentNote) return;

    let content, filename, mimeType;

    switch (type) {
      case 'txt':
        content = this.getPlainText(this.currentNote.content);
        filename = `${this.currentNote.title}.txt`;
        mimeType = 'text/plain';
        break;
      case 'html':
        content = this.generateHTMLExport(this.currentNote);
        filename = `${this.currentNote.title}.html`;
        mimeType = 'text/html';
        break;
      case 'json':
        content = JSON.stringify(this.currentNote, null, 2);
        filename = `${this.currentNote.title}.json`;
        mimeType = 'application/json';
        break;
      case 'pdf':
        this.exportToPDF();
        return;
    }

    this.downloadFile(content, filename, mimeType);
    this.showNotification(window.i18n.t('messages.noteExported'), 'success');
  }

  getPlainText(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  generateHTMLExport(note) {
    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${note.title}</title>
    <style>
        body { font-family: 'Inter', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
        .meta { color: #666; font-size: 14px; margin: 10px 0; }
        .content { font-size: 16px; }
        .tags { margin-top: 20px; }
        .tag { background: #e1e8ff; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${note.title}</h1>
        <div class="meta">
            <p>${window.i18n.t('viewer.createdLabel')} ${new Date(note.createdAt).toLocaleString(window.i18n.currentLanguage === 'en' ? 'en-US' : 'tr-TR')}</p>
            <p>${window.i18n.t('viewer.updatedLabel')} ${new Date(note.updatedAt).toLocaleString(window.i18n.currentLanguage === 'en' ? 'en-US' : 'tr-TR')}</p>
            ${note.mood ? `<p>Ruh Hali: ${note.mood}</p>` : ''}
            ${note.weather ? `<p>Hava Durumu: ${note.weather}</p>` : ''}
        </div>
    </div>
    <div class="content">
        ${note.content}
    </div>
    ${
      note.tags && note.tags.length > 0
        ? `
    <div class="tags">
        <h3>Etiketler:</h3>
        ${note.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
    </div>
    `
        : ''
    }
</body>
</html>`;
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async exportToPDF() {
    // Use html2pdf (included via CDN) to export the viewer content as a PDF.
    try {
      const note = this.currentNote;
      if (!note) return this.showNotification(window.i18n.t('messages.noNoteSelected'), 'warning');

      // Create container and basic structure
      const container = document.createElement('div');
      container.className = 'pdf-export-container';
      container.style.background = 'white';
      container.style.padding = '20px';
      container.style.boxSizing = 'border-box';
      container.style.maxWidth = '800px';
      container.style.margin = '0 auto';

      // Try to inline the app stylesheet (so colors, variables and layout match the app)
      try {
        const resp = await fetch('styles.css');
        if (resp.ok) {
          const cssText = await resp.text();
          const style = document.createElement('style');
          // Add a small print tweak to hide sidebars and controls
          style.textContent = cssText + '\n/* PDF export tweaks */\n.editor-sidebar, .titlebar, .sidebar, .notes-list-container, .formatting-toolbar { display: none !important; }\n.pdf-export-container { max-width: 800px; margin: 0 auto; }\n.formatted-content img { max-width: 100% !important; height: auto !important; }\n/* Darker tones for headings and body in PDF */\n.pdf-export-container, .pdf-export-container * { color: #111 !important; }\n.pdf-export-container h1, .pdf-export-container h2, .pdf-export-container h3 { color: #0b1220 !important; font-weight: 700 !important; }\n.pdf-export-container p, .pdf-export-container li, .pdf-export-container span { color: #111 !important; font-weight: 400 !important; }\n';
          container.appendChild(style);
        }
      } catch (e) {
        // ignore fetch errors; we'll still export with fallback styles
        console.warn('Could not inline styles.css for PDF export', e);
      }

      // Title / meta
      const titleEl = document.createElement('h1');
      titleEl.textContent = note.title || 'Untitled';
      titleEl.style.margin = '0 0 8px 0';
      container.appendChild(titleEl);

      const meta = document.createElement('div');
      meta.style.color = '#666';
      meta.style.marginBottom = '12px';
      const locale = window.i18n.currentLanguage === 'en' ? 'en-US' : 'tr-TR';
      meta.innerHTML = `${window.i18n.t('viewer.createdLabel')} ${new Date(note.createdAt).toLocaleString(locale)} &nbsp; ${window.i18n.t('viewer.updatedLabel')} ${new Date(note.updatedAt).toLocaleString(locale)}`;
      container.appendChild(meta);

      // Content: if markdown, render with marked; otherwise clone formatted HTML
      const contentWrap = document.createElement('div');
      contentWrap.className = 'pdf-note-content';
      if (note.isMarkdown && window.marked && marked.parse) {
        contentWrap.innerHTML = marked.parse(note.content || '');
      } else {
        // Prefer the rendered viewer content so any formatting is preserved
        const viewerHtml = (this.viewerText && this.viewerText.innerHTML) ? this.viewerText.innerHTML : (note.content || '');
        contentWrap.innerHTML = viewerHtml;
      }
      container.appendChild(contentWrap);

      const opt = {
        margin:       12,
        filename:     `${(note.title || 'note').replace(/[^a-z0-9\-\_ ]/gi, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      this.showNotification(window.i18n.t('messages.pdfCreating'), 'info');
      // Generate PDF from the container
      html2pdf().from(container).set(opt).save().then(() => {
        this.showNotification(window.i18n.t('messages.pdfCreated'), 'success');
      }).catch((err) => {
        console.error('PDF export error', err);
        this.showNotification(window.i18n.t('messages.pdfError'), 'error');
      });
    } catch (err) {
      console.error('exportToPDF error', err);
      this.showNotification(window.i18n.t('messages.pdfExportError'), 'error');
    }
  }

  // Modal methods
  showModal(modal) {
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);

    // Attach a temporary key handler so Enter triggers the modal's primary action
    // Only attach one handler per modal instance
    if (!modal._enterKeyHandler) {
      const handler = (e) => {
        if (e.key !== 'Enter') return;
        // If focus is inside a textarea or contenteditable, let Enter behave normally
        const active = document.activeElement;
        if (!active) return;
        const tag = (active.tagName || '').toLowerCase();
        if (tag === 'textarea' || active.isContentEditable) return;

        // Special-case: if this is the confirm modal, prefer the explicit confirm button id
        if (modal.id === 'confirmModal') {
          const cb = document.getElementById('confirmBtn');
          if (cb) {
            e.preventDefault();
            cb.click();
            return;
          }
        }

        // Try a sequence of selectors to find the modal's primary action (supports btn-primary, btn-danger, generic btn)
        const selectors = [
          '.modal-footer .btn-primary',
          '.modal-footer .btn-danger',
          '.modal-actions .btn-primary',
          '.modal-actions .btn-danger',
          '.modal-footer .btn',
          '.modal-actions .btn',
          '.btn-primary',
          '.btn-danger',
          '.btn'
        ];

        let primary = null;
        for (const s of selectors) {
          primary = modal.querySelector(s);
          if (primary) break;
        }

        if (primary) {
          e.preventDefault();
          primary.click();
        }
      };

      modal._enterKeyHandler = handler;
      document.addEventListener('keydown', handler);
    }
  }

  hideModal(modal) {
    // Remove the visible class and hide immediately to avoid perceived lag.
    // Previously we waited for the CSS transition before hiding which caused
    // a delay when users expected the popup to close right away.
    modal.classList.remove('show');
    modal.classList.add('hidden');
    // Remove temporary enter key handler if present
    try {
      if (modal._enterKeyHandler) {
        document.removeEventListener('keydown', modal._enterKeyHandler);
        delete modal._enterKeyHandler;
      }
    } catch (e) {
      // ignore
    }
  }

  hideAllModals() {
    document.querySelectorAll('.modal').forEach((modal) => {
      this.hideModal(modal);
    });
  }

  showConfirm(message, callback) {
    this.confirmMessage.textContent = message;
    this.confirmCallback = callback;
    this.showModal(this.confirmModal);
  }

  showConfirmDialog(title, message) {
    return new Promise((resolve) => {
      // Set up modal
      const prevTitle = this.confirmModal.querySelector('h3')?.textContent || '';
      const titleEl = this.confirmModal.querySelector('h3');
      if (titleEl && title) titleEl.textContent = title;
      this.confirmMessage.textContent = message;

      const handleConfirm = () => {
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        this.confirmBtn.removeEventListener('click', handleConfirm);
        this.cancelBtn.removeEventListener('click', handleCancel);
        if (titleEl) titleEl.textContent = prevTitle;
        this.hideModal(this.confirmModal);
      };

      this.confirmBtn.addEventListener('click', handleConfirm);
      this.cancelBtn.addEventListener('click', handleCancel);

      this.showModal(this.confirmModal);
    });
  }

  // Notification methods
  showNotification(message, type = 'info', meta = {}) {
    this.notificationText.textContent = message;
    this.notification.className = `notification ${type}`;

    // Set appropriate icon
    let iconClass;
    switch (type) {
      case 'success':
        iconClass = 'fas fa-check-circle';
        break;
      case 'error':
        iconClass = 'fas fa-exclamation-circle';
        break;
      case 'warning':
        iconClass = 'fas fa-exclamation-triangle';
        break;
      default:
        iconClass = 'fas fa-info-circle';
    }
    this.notificationIcon.className = iconClass;

    this.notification.classList.remove('hidden');

    // If meta.notificationId is provided, attach click handler to mark as read and open notifications
    if (meta && meta.notificationId) {
      this.notification.dataset.notificationId = String(meta.notificationId);
      this.notification.style.cursor = 'pointer';
      // Remove previous handler if any
      if (this._toastClickHandler) this.notification.removeEventListener('click', this._toastClickHandler);
      this._toastClickHandler = (e) => {
        const nid = parseInt(this.notification.dataset.notificationId);
        if (!Number.isNaN(nid)) {
          this.markNotificationAsRead(nid);
        }
        this.showNotificationsScreen();
        this.hideNotification();
      };
      this.notification.addEventListener('click', this._toastClickHandler);
    } else {
      this.notification.style.cursor = '';
      if (this._toastClickHandler) {
        this.notification.removeEventListener('click', this._toastClickHandler);
        this._toastClickHandler = null;
      }
    }

    // Auto hide after 3 seconds
    setTimeout(() => {
      this.hideNotification();
    }, 3000);
  }

  hideNotification() {
    this.notification.classList.add('hidden');
  }

  applyStoredFormatting(formatting) {
    this.setEditorFormatting(formatting);
  }

  updateCustomDropdown(dropdownId, value) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const selectSelected = dropdown.querySelector('.select-selected');
    const selectItems = dropdown.querySelectorAll('.select-item');

    // Find the matching option and update
    selectItems.forEach((item) => {
      item.classList.remove('active');
      if (item.dataset.value === value) {
        item.classList.add('active');
        // Font dropdown'ları için özel handling
        if (dropdownId === 'fontFamily' || dropdownId === 'fontSize') {
          selectSelected.textContent = item.textContent;
        } else {
          selectSelected.textContent = item.textContent;
        }
      }
    });
  }

  getDefaultFormatting() {
    return { ...this.defaultFormatting };
  }

  captureEditorSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (this.isSelectionInsideEditor(range.commonAncestorContainer)) {
      this.savedSelection = range.cloneRange();
    }
  }

  restoreEditorSelection() {
    if (!this.savedSelection) return;
    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    const range = this.savedSelection.cloneRange ? this.savedSelection.cloneRange() : this.savedSelection;
    selection.addRange(range);
  }

  // Insert HTML at the stored editor selection (or at current caret)
  insertHtmlAtSavedSelection(html) {
    try {
      // Attempt to restore stored selection
      this.restoreEditorSelection();
      // Use execCommand as a fallback for inserting HTML
      if (document.queryCommandSupported && document.queryCommandSupported('insertHTML')) {
        document.execCommand('insertHTML', false, html);
      } else {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          // Append at end
          this.richEditor.insertAdjacentHTML('beforeend', html);
          return;
        }
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const frag = document.createRange().createContextualFragment(html);
        range.insertNode(frag);
      }
    } catch (e) {
      // As a last resort, append to editor
      try { this.richEditor.insertAdjacentHTML('beforeend', html); } catch (e2) {}
    }
  }

  handleInsertTable() {
    // Read values from modal
    const rows = Math.max(1, parseInt(this.tableRowsInput?.value || '2', 10));
    const cols = Math.max(1, parseInt(this.tableColsInput?.value || '2', 10));
    const hasHeader = !!(this.tableHeaderCheckbox && this.tableHeaderCheckbox.checked);

    // Build simple table HTML
    let html = '<table class="inserted-table" border="1" style="border-collapse: collapse; width: 100%;">';
    if (hasHeader) {
      html += '<thead><tr>';
      for (let c = 0; c < cols; c++) html += `<th style="padding:6px;text-align:left">Başlık ${c + 1}</th>`;
      html += '</tr></thead>';
    }
    html += '<tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) html += `<td style="padding:6px">&nbsp;</td>`;
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';

    // Insert into editor at caret/selection
    this.insertHtmlAtSavedSelection(html);

    // Update word/char counts and mark note dirty
    try { this.captureEditorSelection(); } catch (e) {}
    try { this.updateWordCount(); } catch (e) {}
    // Close modal
    this.hideModal(this.tableModal);
  }

  clearSavedSelection() {
    this.savedSelection = null;
  }

  setEditorFormatting(formatting = {}) {
    const applied = { ...this.getDefaultFormatting(), ...(formatting || {}) };
    this.baseFormatting = { ...applied };

    if (this.richEditor) {
      this.richEditor.style.fontFamily = applied.fontFamily;
      this.richEditor.style.fontSize = applied.fontSize;
    }

    if (this.fontFamilyDropdown) {
      this.updateCustomDropdown('fontFamily', applied.fontFamily);
    }

    if (this.fontSizeDropdown) {
      const numericSize = parseInt(applied.fontSize, 10);
      if (!Number.isNaN(numericSize)) {
        this.updateCustomDropdown('fontSize', numericSize.toString());
      }
    }
  }

  getEditorFormatting() {
    return { ...this.baseFormatting };
  }

  applyViewerFormatting(formatting = {}) {
    if (!this.viewerText) return;
    const applied = { ...this.getDefaultFormatting(), ...(formatting || {}) };
    this.viewerText.style.fontFamily = applied.fontFamily;
    this.viewerText.style.fontSize = applied.fontSize;
  }

  shouldApplyToSelection(selection) {
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return false;
    return this.isSelectionInsideEditor(range.commonAncestorContainer);
  }

  isSelectionInsideEditor(node) {
    if (!this.richEditor || !node) return false;
    return this.richEditor.contains(node);
  }

  areFormattingsEqual(a = {}, b = {}) {
    return (
      (a.fontFamily || '') === (b.fontFamily || '') &&
      (a.fontSize || '') === (b.fontSize || '')
    );
  }

  // Content tracking for save button state
  trackContentChanges() {
    const currentContent = this.getCurrentNoteContent();
    this.currentNoteContent = currentContent;
    this.updateSaveButtonState();
  }

  getCurrentNoteContent() {
    // Sync checkbox states to HTML before saving
    this.syncCheckboxStates();

    return {
      title: this.noteTitle.value.trim(),
      content: this.richEditor.innerHTML,
      mood: this.selectedMood,
      weather: this.selectedWeather,
      tags: this.tags,
      formatting: { ...this.getEditorFormatting() },
    };
  }

  syncCheckboxStates() {
    // Update HTML attributes to match current checked states
    const checkboxes = this.richEditor.querySelectorAll('input[type="checkbox"]');

    checkboxes.forEach((checkbox) => {
      // Create a new checkbox with correct attributes
      let outerHTML = checkbox.outerHTML;

      if (checkbox.checked) {
        // Add checked attribute if not present
        if (!outerHTML.includes('checked=')) {
          outerHTML = outerHTML.replace('<input ', '<input checked="checked" ');
        }
      } else {
        // Remove checked attribute if present
        outerHTML = outerHTML.replace(/\s*checked="checked"/g, '').replace(/\s*checked/g, '');
      }

      // Replace the checkbox in the DOM
      checkbox.outerHTML = outerHTML;
    });
  }

  updateSaveButtonState() {
    const hasChanges = this.hasUnsavedChanges();
    const isEmpty = this.isCurrentNoteEmpty();

    if (isEmpty || (!hasChanges && this.isAutoSaved)) {
      this.disableSaveButton();
    } else {
      this.enableSaveButton();
    }
  }

  hasUnsavedChanges() {
    if (!this.originalNoteState) return true;

    const current = this.getCurrentNoteContent();
    const currentTags = [...(current.tags || [])].sort();
    const originalTags = [...(this.originalNoteState.tags || [])].sort();

    // Compare with original state
    return (
      current.title !== this.originalNoteState.title ||
      current.content !== this.originalNoteState.content ||
      current.mood !== this.originalNoteState.mood ||
      current.weather !== this.originalNoteState.weather ||
      JSON.stringify(currentTags) !== JSON.stringify(originalTags) ||
      !this.areFormattingsEqual(current.formatting, this.originalNoteState.formatting)
    );
  }

  isCurrentNoteEmpty() {
    const content = this.getCurrentNoteContent();
    const hasTitle = content.title && content.title.trim();
    const hasContent = content.content && content.content.trim() && content.content !== '<br>';
    const hasMood = content.mood;
    const hasWeather = content.weather;
    const hasTags = content.tags && content.tags.length > 0;

    return !hasTitle && !hasContent && !hasMood && !hasWeather && !hasTags;
  }

  enableSaveButton() {
    this.saveNoteBtn.disabled = false;
    this.saveNoteBtn.classList.remove('disabled');
    this.saveNoteBtn.style.opacity = '1';
    this.saveNoteBtn.style.cursor = 'pointer';
  }

  disableSaveButton() {
    this.saveNoteBtn.disabled = true;
    this.saveNoteBtn.classList.add('disabled');
    this.saveNoteBtn.style.opacity = '0.5';
    this.saveNoteBtn.style.cursor = 'not-allowed';
  }

  markAsSaved() {
    this.lastSavedContent = this.getCurrentNoteContent();
    this.isAutoSaved = true;
    this.updateSaveButtonState();
  }

  // List insertion methods
  insertList(type) {
    this.restoreEditorSelection();
    this.richEditor.focus();
    const listHtml =
      type === 'ol'
        ? '<ol><li>Birinci madde</li><li>İkinci madde</li><li>Üçüncü madde</li></ol><p><br></p>'
        : '<ul><li>Birinci madde</li><li>İkinci madde</li><li>Üçüncü madde</li></ul><p><br></p>';

    document.execCommand('insertHTML', false, listHtml);
    this.trackContentChanges();
    this.captureEditorSelection();
  }

  insertChecklist() {
    this.restoreEditorSelection();
    this.richEditor.focus();
    const uniqueId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const checklistHtml = `<div class="checklist"><div class="checklist-item"><input type="checkbox" id="${uniqueId}"><label for="${uniqueId}">Görev 1</label></div></div><p><br></p>`;

    document.execCommand('insertHTML', false, checklistHtml);
    this.trackContentChanges();
    this.captureEditorSelection();
  }

  // ...existing code...

  /**
   * Geçerli notu otomatik kilitler
   */
  autoLockCurrentNote() {
    // Auto-lock the current note if it's locked and was temporarily unlocked
    if (this.currentNote && this.currentNote.isLocked && this.currentNote.isUnlocked) {
      this.currentNote.isUnlocked = false;
      this.updateNotesList();
    }
  }

  // ...existing code...

  /**
   * Notu kilitler
   * @param {Object} note - Kilitlenecek not
   */
  async lockNote(note) {
    const password = await this.showPasswordModal(window.i18n.t('messages.setPasswordForNote'));
    if (password && password.trim()) {
  // Locking note (debug logs removed)
      note.isLocked = true;
      note.password = password.trim();

      // Clean up temporary unlock flag if exists
      delete note.isUnlocked;

      this.saveNotes();
      this.updateNotesList();
      this.showNotification(window.i18n.t('messages.noteLocked'), 'success');
  // Note lock result (debug logs removed)
    }
  }

  async unlockNote(note) {
    const password = await this.showPasswordModal(window.i18n.t('messages.enterPasswordToUnlock'));
    if (password === note.password) {
      // Permanently unlock
      note.isLocked = false;
      delete note.password;
      delete note.isUnlocked; // Clean up temporary unlock flag
      this.saveNotes();
      this.updateNotesList();
      if (this.currentNote && this.currentNote.id === note.id) {
        this.displayNote(note);
      }
      this.showNotification(window.i18n.t('messages.noteUnlocked'), 'success');
    } else if (password !== null) {
      // null means cancelled
      this.showNotification(window.i18n.t('messages.wrongPassword'), 'error');
    }
  }

  async unlockNoteForViewing(note) {
    const password = await this.showPasswordModal(window.i18n.t('messages.noteIsLocked'));
    if (password === note.password) {
      // Temporarily unlock the note for viewing
      note.isUnlocked = true;

      // Continue with note selection
      this.currentNote = note;
      this.originalNoteState = {
        title: note.title,
        content: note.content,
        mood: note.mood,
        weather: note.weather,
        tags: [...(note.tags || [])],
        formatting: { ...(note.formatting || this.getDefaultFormatting()) },
      };

      this.saveLastViewedNote(note.id);
      this.showViewer();
      this.displayNote(note);
  this.setActiveNoteInList(this.currentNote.id);

      this.showNotification(window.i18n.t('messages.noteTemporarilyUnlocked'), 'info');
    } else if (password !== null) {
      // null means cancelled
      this.showNotification(window.i18n.t('messages.wrongPassword'), 'error');
    }
  }

  deleteNoteById(noteId) {
    const note = this.notes.find((n) => n.id == noteId);
    if (!note) return;

    this.confirmMessage.textContent = `"${note.title}" ${window.i18n.t('messages.confirmDelete')}`;
    this.confirmCallback = () => {
      const index = this.notes.findIndex((n) => n.id == noteId);
      if (index >= 0) {
        const deletedNote = this.notes[index];
        this.notes.splice(index, 1);
        this.saveNotes();

        // Only update the specific folder if note was in a folder, otherwise update main list
        if (deletedNote.folderId && deletedNote.folderId !== 'default') {
          this.updateSpecificFolder(deletedNote.folderId);
        } else {
          this.updateNotesList();
        }
    this.updateStats();

    // If user is viewing Favorites, refresh the list so it includes/excludes updated favorites
    if (this.currentFilter === 'favorites') this.updateNotesList();

        // If deleted note was current note, show welcome or select another
        if (this.currentNote && this.currentNote.id === noteId) {
          this.currentNote = null;
          if (this.notes.length > 0) {
            this.selectNote(this.notes[0]);
          } else {
            this.showWelcome();
          }
        }

        this.showNotification(window.i18n.t('messages.noteDeleted'), 'success');
      }
    };
    this.showModal(this.confirmModal);
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    if (sidebar.classList.contains('hidden')) {
      sidebar.classList.remove('hidden');
      hamburgerBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    } else {
      sidebar.classList.add('hidden');
      hamburgerBtn.innerHTML = '<i class="fas fa-bars"></i>';
    }
  }

  toggleSearch() {
    const isHidden = this.searchContainer.classList.contains('hidden');

    // Hide sort dropdown if open
    this.sortDropdown.classList.add('hidden');
    this.sortBtn.classList.remove('active');

    if (isHidden) {
      this.searchContainer.classList.remove('hidden');
      this.searchBtn.classList.add('active');
      this.searchInput.focus();
    } else {
      this.searchContainer.classList.add('hidden');
      this.searchBtn.classList.remove('active');
      this.searchInput.value = '';
      this.searchNotes(''); // Clear search
    }
  }

  toggleSort() {
    const isHidden = this.sortDropdown.classList.contains('hidden');

    // Hide search container if open
    this.searchContainer.classList.add('hidden');
    this.searchBtn.classList.remove('active');

    if (isHidden) {
      // Position dropdown relative to sort button
      const buttonRect = this.sortBtn.getBoundingClientRect();
      const containerRect = this.sortBtn.offsetParent.getBoundingClientRect();

      this.sortDropdown.style.position = 'absolute';
      this.sortDropdown.style.top = buttonRect.bottom - containerRect.top + 4 + 'px';
      this.sortDropdown.style.left = 'auto';
      this.sortDropdown.style.right = containerRect.right - buttonRect.right + 'px';

      this.sortDropdown.classList.remove('hidden');
      this.sortBtn.classList.add('active');
    } else {
      this.sortDropdown.classList.add('hidden');
      this.sortBtn.classList.remove('active');
    }
  }

  toggleNoteFavorite(noteId) {
    const note = this.notes.find((n) => n.id == noteId);
    if (!note) return;

    note.isFavorite = !note.isFavorite;
    this.saveNotes();
    this.updateNotesList();
    this.showNotification(
      note.isFavorite ? window.i18n.t('messages.addedToFavorites') : window.i18n.t('messages.removedFromFavorites'),
      'success'
    );
  }

  setupCustomDropdown() {
    // Setup all custom dropdowns
    const customSelects = document.querySelectorAll('.custom-select');

    customSelects.forEach((customSelect) => {
      const selectSelected = customSelect.querySelector('.select-selected');
      const selectItems = customSelect.querySelector('.select-items');
      const selectOptions = customSelect.querySelectorAll('.select-item');

      // Toggle dropdown
      selectSelected.addEventListener('mousedown', () => {
        this.captureEditorSelection();
      });

      selectSelected.addEventListener('click', (e) => {
        e.stopPropagation();

        // Check current state before closing all dropdowns
        const isCurrentlyHidden = selectItems.classList.contains('select-hide');

        // Close all dropdowns first
        this.closeAllDropdowns();

        // If this dropdown was closed, open it
        if (isCurrentlyHidden) {
          selectItems.classList.remove('select-hide');
          selectSelected.classList.add('select-arrow-active');
        }
        // If it was open, closeAllDropdowns() already closed it
      });

      // Handle option selection
      selectOptions.forEach((option) => {
        option.addEventListener('click', (e) => {
          e.stopPropagation();
          const value = option.dataset.value;
          const text = option.textContent;

          // Update selected text
          selectSelected.textContent = text;

          // Update active class
          selectOptions.forEach((opt) => opt.classList.remove('active'));
          option.classList.add('active');

          // Close dropdown
          selectItems.classList.add('select-hide');
          selectSelected.classList.remove('select-arrow-active');

          // Handle different dropdown types
          const dropdownId = customSelect.id;
          if (dropdownId === 'sortSelect') {
            this.changeSorting(value);
          } else if (dropdownId === 'fontFamily') {
            this.changeFontFamily(value);
          } else if (dropdownId === 'fontSize') {
            this.changeFontSize(value);
          }
        });
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      this.closeAllDropdowns();
    });
  }

  closeAllDropdowns() {
    const selectItems = document.querySelectorAll('.select-items');
    const selectSelected = document.querySelectorAll('.select-selected');

    selectItems.forEach((item) => item.classList.add('select-hide'));
    selectSelected.forEach((selected) => selected.classList.remove('select-arrow-active'));
  }

  changeFontFamily(fontFamily) {
    if (!fontFamily) return;

    this.restoreEditorSelection();
    this.richEditor.focus();
    const selection = window.getSelection();

    if (this.shouldApplyToSelection(selection)) {
      this.applyFormat('fontFamily', fontFamily);
    } else {
      const updatedFormatting = { ...this.getEditorFormatting(), fontFamily };
      this.setEditorFormatting(updatedFormatting);
      this.trackContentChanges();
      this.captureEditorSelection();
    }
  }

  changeFontSize(fontSize) {
    if (!fontSize && fontSize !== 0) return;

    const sizeValue = fontSize.toString().endsWith('px') ? fontSize.toString() : `${fontSize}px`;

    this.restoreEditorSelection();
    this.richEditor.focus();
    const selection = window.getSelection();

    if (this.shouldApplyToSelection(selection)) {
      this.applyFormat('fontSize', sizeValue);
    } else {
      const updatedFormatting = { ...this.getEditorFormatting(), fontSize: sizeValue };
      this.setEditorFormatting(updatedFormatting);
      this.trackContentChanges();
      this.captureEditorSelection();
    }
  }

  // ============================================
  // SETTINGS METHODS
  // ============================================

  showSettingsModal() {
    this.showModal(this.settingsModal);
  }

  loadSettings() {
    // Load language preference
    if (this.languageSelect) {
      const savedLang = localStorage.getItem('app-language') || 'tr';
      this.languageSelect.value = savedLang;
      console.log('Language loaded from settings:', savedLang);
    } else {
      console.warn('Language select element not found in loadSettings');
    }

    // Load dark mode preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    this.darkModeToggle.checked = isDarkMode;
    this.applyTheme(isDarkMode);
    // Load accent color
    const accent = localStorage.getItem('accentColor') || null;
    if (accent) this.setAccentColor(accent, {persist:false});

  // Load sync-folder-accent preference
  const syncFolders = localStorage.getItem('syncFolderAccent') === '1';
  if (this.syncFolderAccentToggle) this.syncFolderAccentToggle.checked = syncFolders;
  // Ensure we apply or restore folder colors based on the stored preference.
  // Calling with false will attempt to restore from the stored backup if available.
  this.applyFolderAccentSync(syncFolders);

    // Load native/system notifications preference (default true)
    const nativeNotif = localStorage.getItem('settings.nativeNotifications');
    const nativeEnabled = nativeNotif === null ? true : (nativeNotif === '1' || nativeNotif === 'true');
    if (this.toggleNativeNotifications) this.toggleNativeNotifications.checked = nativeEnabled;

    // Load max pinned notes preference (default 3)
    const maxPinned = parseInt(localStorage.getItem('maxPinnedNotes'), 10) || 3;
    if (this.maxPinnedSelect) this.maxPinnedSelect.value = String(maxPinned);
    if (this.maxPinnedSelect) {
      this.maxPinnedSelect.addEventListener('change', (e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v >= 3 && v <= 10) {
          localStorage.setItem('maxPinnedNotes', String(v));
          this.showNotification(window.i18n.t('messages.pinnedLimitUpdated'), 'success');
        }
      });
    }

    // Query start-at-login from main (async, best-effort)
    try {
      if (this.startAtLoginToggle && window.electronAPI && typeof window.electronAPI.getStartAtLogin === 'function') {
        window.electronAPI.getStartAtLogin().then((res) => {
          if (res && typeof res.enabled === 'boolean') this.startAtLoginToggle.checked = !!res.enabled;
        }).catch(() => {});
      }
    } catch {}

    // Query close-to-tray preference from main/store
    try {
      if (this.closeToTrayToggle && window.electronAPI && typeof window.electronAPI.getCloseToTray === 'function') {
        window.electronAPI.getCloseToTray().then((res) => {
          if (res && typeof res.enabled === 'boolean') this.closeToTrayToggle.checked = !!res.enabled;
        }).catch(() => {});
      }
    } catch {}
  }

  saveSettings() {
    // Save dark mode preference
    localStorage.setItem('darkMode', this.darkModeToggle.checked);
    // Save sync-folder-accent preference
    if (this.syncFolderAccentToggle) localStorage.setItem('syncFolderAccent', this.syncFolderAccentToggle.checked ? '1' : '0');
      // Save native/system notifications preference
      if (this.toggleNativeNotifications) localStorage.setItem('settings.nativeNotifications', this.toggleNativeNotifications.checked ? '1' : '0');
  }

  setAccentColor(hex, options = { persist: true }) {
    if (!hex) return;
    // normalize hex to lowercase
    const color = hex.toLowerCase();
    // apply primary-ish variable and accent variable
    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--accent-color', color);

    // derive some rgba variants for existing rules that expect alpha variants
    // naive conversion for the common yellow used previously (245,158,11)
    // we'll generate rgba using a small helper to convert hex -> r,g,b
    function hexToRgb(h) {
      const hex = h.replace('#','');
      const bigint = parseInt(hex.length===3?hex.split('').map(c=>c+c).join(''):hex,16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return [r,g,b];
    }
    const [r,g,b] = hexToRgb(color);
    document.documentElement.style.setProperty('--accent-color-rgba-15', `rgba(${r}, ${g}, ${b}, 0.15)`);
    document.documentElement.style.setProperty('--accent-color-rgba-20', `rgba(${r}, ${g}, ${b}, 0.2)`);
    document.documentElement.style.setProperty('--accent-color-rgba-30', `rgba(${r}, ${g}, ${b}, 0.3)`);
  document.documentElement.style.setProperty('--accent-color-rgba-18', `rgba(${r}, ${g}, ${b}, 0.18)`);
  document.documentElement.style.setProperty('--accent-color-rgba-10', `rgba(${r}, ${g}, ${b}, 0.10)`);
  document.documentElement.style.setProperty('--accent-color-rgba-12', `rgba(${r}, ${g}, ${b}, 0.12)`);

    if (options.persist !== false) localStorage.setItem('accentColor', color);
    // If sync option enabled, apply accent color to all folder icons
    const syncFolders = localStorage.getItem('syncFolderAccent') === '1';
    if (syncFolders) this.applyFolderAccentSync(true);

    // update active state on swatch buttons so the selected one appears larger
    try {
      const allSwatches = Array.from(document.querySelectorAll('.swatch-btn'));
      allSwatches.forEach((btn) => {
        try {
          const btnColor = (btn.dataset.color || '').toLowerCase();
          if (btnColor && btnColor === color) btn.classList.add('active');
          else btn.classList.remove('active');
        } catch (e) { /* noop for individual button */ }
      });
    } catch (e) {
      // non-fatal
    }
  }

  applyFolderAccentSync(enabled) {
    // If enabled, set every folder color to the current accent color
    if (!this.folders) return;
    if (enabled) {
      // Save backup of original colors if not already saved
      const existingBackup = localStorage.getItem('folderColorsBackup');
      if (!existingBackup) {
        const backup = {};
        this.folders.forEach((f) => {
          backup[f.id] = f.color;
        });
        try {
          localStorage.setItem('folderColorsBackup', JSON.stringify(backup));
        } catch (e) {
          console.warn('Could not save folder color backup', e);
        }
      }

      const accent = localStorage.getItem('accentColor') || getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#f59e0b';
      this.folders = this.folders.map((f) => ({ ...f, color: accent }));
    } else {
      // Restore from backup if available
      const backupStr = localStorage.getItem('folderColorsBackup');
      if (backupStr) {
        try {
          const backup = JSON.parse(backupStr || '{}');
          this.folders = this.folders.map((f) => ({ ...f, color: backup[f.id] || f.color }));
        } catch (e) {
          console.warn('Failed to parse folder color backup', e);
        }
        // Remove backup after restore
        try { localStorage.removeItem('folderColorsBackup'); } catch (e) {}
      }
    }

    // Persist changes and refresh UI
    this.saveFolders();
    this.updateFoldersList();
    // Make sure folder notes are repopulated after DOM rebuild
    this.updateFolderNotes();
  }

  toggleDarkMode(enabled) {
    this.applyTheme(enabled);
    this.saveSettings();
    this.showNotification(
      enabled ? 'Karanlık mod etkinleştirildi' : 'Aydınlık mod etkinleştirildi',
      'info'
    );
  }

  applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  // ============================================
  // IMPORT/EXPORT METHODS
  // ============================================

  importNotes() {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedData = JSON.parse(text);

        // Support import format that includes notes and folders
        if (!importedData || (!Array.isArray(importedData.notes) && !Array.isArray(importedData.folders))) {
          throw new Error('Geçersiz dosya formatı');
        }

        // Ask user if they want to merge or replace
        const totalNotes = Array.isArray(importedData.notes) ? importedData.notes.length : 0;
        const totalFolders = Array.isArray(importedData.folders) ? importedData.folders.length : 0;
        const merge = await this.showConfirmDialog(
          'İçe Aktarma Seçeneği',
          `${totalNotes} not ve ${totalFolders} klasör bulundu. Mevcut verilerle birleştirmek istiyor musunuz? (Hayır seçerseniz mevcut notlar ve/veya klasörler silinir)`
        );

        if (!merge) {
          this.notes = [];
          this.folders = [];
        }

        // If folders are provided, import them with ID remapping to avoid collisions
        const folderIdMap = {};
        if (Array.isArray(importedData.folders)) {
          importedData.folders.forEach((f) => {
            const newId = Date.now() + Math.floor(Math.random() * 1000000);
            folderIdMap[f.id] = newId;
            const newFolder = { ...f, id: newId };
            // ensure expanded flag exists
            newFolder.expanded = newFolder.expanded !== undefined ? newFolder.expanded : true;
            this.folders.push(newFolder);
          });
        }

        // Add imported notes and remap folderId if needed
        let addedCount = 0;
        if (Array.isArray(importedData.notes)) {
          importedData.notes.forEach((note) => {
            const newNoteId = Date.now() + Math.floor(Math.random() * 1000000);
            const mappedFolderId = note.folderId && folderIdMap[note.folderId] ? folderIdMap[note.folderId] : note.folderId;
            const newNote = {
              ...note,
              id: newNoteId,
              folderId: mappedFolderId || null,
              createdAt: note.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            this.notes.push(newNote);
            addedCount++;
          });
        }

        // Persist folders (if any) and notes, then refresh UI so imported folders/notes appear immediately
        try {
          await this.saveFolders();
        } catch (e) {
          console.warn('Folder save failed during import', e);
        }
        await this.saveNotes();
        // Refresh UI
        this.updateFoldersList();
        this.updateNotesList();
        this.updateFolderNotes();
        this.updateStats();

        this.showNotification(`${addedCount} not başarıyla içe aktarıldı!`, 'success');
        // Close settings modal immediately
        this.settingsModal.classList.remove('show');
        this.settingsModal.classList.add('hidden');
      } catch (error) {
        console.error('Import error:', error);
        this.showNotification('Dosya içe aktarılırken hata oluştu: ' + error.message, 'error');
      }
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  exportAllNotes() {
    if (this.notes.length === 0) {
      this.showNotification('Dışa aktarılacak not bulunamadı!', 'warning');
      return;
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      totalNotes: this.notes.length,
      totalFolders: this.folders.length,
      notes: this.notes,
      folders: this.folders,
      // include some settings for convenience
      settings: {
        accentColor: localStorage.getItem('accentColor') || null,
        darkMode: localStorage.getItem('darkMode') || null,
        syncFolderAccent: localStorage.getItem('syncFolderAccent') || null,
      },
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gunluk-yedek-${new Date().toISOString().split('T')[0]}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    this.showNotification(`${this.notes.length} not başarıyla dışa aktarıldı!`, 'success');
  }

  exportSettings() {
    const keys = ['accentColor', 'darkMode', 'maxPinnedNotes', 'syncFolderAccent', 'folderColorsBackup'];
    const settings = {};
    keys.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v !== null) settings[k] = v;
    });

    const payload = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      settings,
    };

    const dataStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capnote-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showNotification('Ayarlar dışa aktarıldı', 'success');
  }

  // New: export ALL data (notes, folders, reminders, notifications, settings)
  exportAllData() {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      notes: this.notes || [],
      folders: this.folders || [],
      reminders: this.reminders || [],
      notifications: this.notifications || [],
      settings: {},
    };

    // Collect a set of known localStorage settings
    const keys = ['accentColor', 'darkMode', 'maxPinnedNotes', 'syncFolderAccent'];
    keys.forEach((k) => {
      try {
        const v = localStorage.getItem(k);
        if (v !== null) exportData.settings[k] = v;
      } catch (e) {
        console.warn('Failed to read setting', k, e);
      }
    });

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capnote-all-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showNotification('Tüm veriler dışa aktarıldı', 'success');
    // Refresh reminder/notification UI and counters in case data changed
    try { this.updateRemindersView(); } catch (e) {}
    try { this.updateNotificationsView(); } catch (e) {}
    try { this.updateActiveRemindersCount(); } catch (e) {}
    try { this.updateActiveNotificationsCount(); } catch (e) {}
  }

  // New: import ALL data and offer merge/replace behaviour
  importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        let data = JSON.parse(text || '{}');

        // Validate structure
        if (!data || (typeof data !== 'object')) throw new Error('Geçersiz dosya formatı');

        // Normalize common single-note or array exports into { notes: [...] }
        // Support: a single note object (exported via exportNote json) or an array of notes
        if (Array.isArray(data)) {
          data = { notes: data };
        } else if (!data.notes && (data.content !== undefined || data.title !== undefined || data.id !== undefined)) {
          // Looks like a single note object
          data = { notes: [data] };
        }

        // Count items
        const notesCount = Array.isArray(data.notes) ? data.notes.length : 0;
        const foldersCount = Array.isArray(data.folders) ? data.folders.length : 0;
        const remindersCount = Array.isArray(data.reminders) ? data.reminders.length : 0;
        const notifsCount = Array.isArray(data.notifications) ? data.notifications.length : 0;

        // Ask user which types to import and whether to merge or replace
        const importOptions = await this.showImportOptionsDialog({
          notes: notesCount > 0,
          folders: foldersCount > 0,
          reminders: remindersCount > 0,
          notifications: notifsCount > 0,
          settings: !!data.settings,
        });

        if (!importOptions) {
          this.showNotification('İçe aktarma iptal edildi', 'warning');
          return;
        }

        const merge = importOptions.merge;

        if (!merge) {
          // clear only the types the user chose to import (replace behaviour per-type)
          if (importOptions.notes) this.notes = [];
          if (importOptions.folders) this.folders = [];
          if (importOptions.reminders) this.reminders = [];
          if (importOptions.notifications) this.notifications = [];
        }

        // Remap folder IDs to avoid collisions when merging
        const folderIdMap = {};
        if (Array.isArray(data.folders)) {
          data.folders.forEach((f) => {
            const newId = Date.now() + Math.floor(Math.random() * 1000000);
            folderIdMap[f.id] = newId;
            const newFolder = { ...f, id: newId };
            newFolder.expanded = newFolder.expanded !== undefined ? newFolder.expanded : true;
            this.folders.push(newFolder);
          });
        }

        // Import notes and remap folderId + build noteId map
        const noteIdMap = {};
        if (Array.isArray(data.notes) && importOptions.notes) {
          data.notes.forEach((note) => {
            const oldId = note.id;
            const newNoteId = Date.now() + Math.floor(Math.random() * 1000000);
            const mappedFolderId = note.folderId && folderIdMap[note.folderId] ? folderIdMap[note.folderId] : note.folderId;
            const newNote = {
              ...note,
              id: newNoteId,
              folderId: mappedFolderId || null,
              createdAt: note.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            // Compute word/char counts for imported note so stats reflect correctly
            try {
              const counts = this.countWordsAndCharsFromHtml(newNote.content || '');
              newNote.wordCount = counts.words;
              newNote.charCount = counts.chars;
            } catch (e) {
              newNote.wordCount = note.wordCount || 0;
              newNote.charCount = note.charCount || 0;
            }

            this.notes.push(newNote);
            if (oldId !== undefined && oldId !== null) noteIdMap[oldId] = newNoteId;
          });
        }

        // Import reminders and notifications with noteId remapping
        let unresolvedRefs = 0;
        if (Array.isArray(data.reminders) && importOptions.reminders) {
          data.reminders.forEach((r) => {
            const newR = { ...r };
            newR.id = Date.now() + Math.floor(Math.random() * 1000000);
            if (newR.noteId) {
              // remap if possible
              if (noteIdMap[newR.noteId]) {
                newR.noteId = noteIdMap[newR.noteId];
              } else {
                // unknown note reference -> null it and count unresolved
                newR.noteId = null;
                unresolvedRefs++;
              }
            }
            this.reminders.push(newR);
          });
        }

        if (Array.isArray(data.notifications) && importOptions.notifications) {
          data.notifications.forEach((n) => {
            const newN = { ...n };
            newN.id = Date.now() + Math.floor(Math.random() * 1000000);
            if (newN.noteId) {
              if (noteIdMap[newN.noteId]) {
                newN.noteId = noteIdMap[newN.noteId];
              } else {
                newN.noteId = null;
                unresolvedRefs++;
              }
            }
            this.notifications.push(newN);
          });
        }

        // Import settings (merge by default)
        if (data.settings && typeof data.settings === 'object') {
          Object.entries(data.settings).forEach(([k, v]) => {
            try {
              // Do not import folderColorsBackup from foreign sources
              if (k === 'folderColorsBackup') return;
              localStorage.setItem(k, String(v));
            } catch (e) {
              console.warn('Could not persist imported setting', k, e);
            }
          });
        }

        // Persist everything
        try { await this.saveFolders(); } catch (e) { console.warn(e); }
        try { await this.saveNotes(); } catch (e) { console.warn(e); }
        try { await this.saveReminders(); } catch (e) { console.warn(e); }
        try { await this.saveNotifications(); } catch (e) { console.warn(e); }

        // Reload UI/state
        this.loadSettings();
        this.updateFoldersList();
        this.updateNotesList();
        this.updateFolderNotes();
  // Refresh reminders/notifications UI and counters
  try { this.updateRemindersView(); } catch (e) {}
  try { this.updateNotificationsView(); } catch (e) {}
  try { this.updateActiveRemindersCount(); } catch (e) {}
  try { this.updateActiveNotificationsCount(); } catch (e) {}

  this.updateStats();

  this.showNotification('Veriler başarıyla içe aktarıldı', 'success');
  this.settingsModal.classList.remove('show');
  this.settingsModal.classList.add('hidden');
      } catch (err) {
        console.error('Import all data error', err);
        this.showNotification('Veriler içe aktarılırken hata oluştu: ' + (err.message || err), 'error');
      }
    });

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  // Show a small modal dialog letting user pick which types to import and merge vs replace
  showImportOptionsDialog(available) {
    return new Promise((resolve) => {
      // create modal element using app modal classes so styling matches
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.display = 'flex';
      const content = document.createElement('div');
      content.className = 'modal-content import-modal';

      // header
      const header = document.createElement('div');
      header.className = 'modal-header';
  const titleWrap = document.createElement('div');
  titleWrap.className = 'modal-title';
  const h3 = document.createElement('h3');
  h3.textContent = 'İçe Aktarma Seçenekleri';
  titleWrap.appendChild(h3);
      header.appendChild(titleWrap);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close';
      closeBtn.innerHTML = '<i class="fas fa-times"></i>';
      header.appendChild(closeBtn);
      content.appendChild(header);

      // body
      const body = document.createElement('div');
      body.className = 'modal-body';

      const form = document.createElement('div');
      form.className = 'form-block';
      const types = ['notes','folders','reminders','notifications','settings'];
      const inputs = {};
      types.forEach((t) => {
        if (!available[t]) return;
        const row = document.createElement('div');
        row.className = 'form-group';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.id = 'imp_opt_' + t;
        cb.className = 'form-checkbox';
        inputs[t] = cb;
        const lbl = document.createElement('label');
        lbl.setAttribute('for', cb.id);
        lbl.textContent = ({notes:'Notlar', folders:'Klasörler', reminders:'Hatırlatmalar', notifications:'Bildirimler', settings:'Ayarlar'})[t] || t;
        row.appendChild(cb);
        row.appendChild(lbl);
        form.appendChild(row);
      });

      const mergeRow = document.createElement('div');
      mergeRow.className = 'form-group';
      const mergeToggle = document.createElement('input');
      mergeToggle.type = 'checkbox';
      mergeToggle.checked = true;
      mergeToggle.id = 'imp_opt_merge';
      mergeToggle.className = 'form-checkbox';
      const mergeLabel = document.createElement('label');
      mergeLabel.setAttribute('for', mergeToggle.id);
      mergeLabel.textContent = 'Mevcut verilerle birleştir';
      mergeRow.appendChild(mergeToggle);
      mergeRow.appendChild(mergeLabel);

      body.appendChild(form);
      body.appendChild(mergeRow);
      content.appendChild(body);

      // footer
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = 'İptal';
      const okBtn = document.createElement('button');
      okBtn.className = 'btn btn-primary';
      okBtn.textContent = 'İçe Aktar';
      footer.appendChild(cancelBtn);
      footer.appendChild(okBtn);
      content.appendChild(footer);

      modal.appendChild(content);
      document.body.appendChild(modal);

      const cleanup = () => { try { document.body.removeChild(modal); } catch (e) {} };

      closeBtn.addEventListener('click', () => { cleanup(); resolve(null); });
      cancelBtn.addEventListener('click', () => { cleanup(); resolve(null); });
      okBtn.addEventListener('click', () => {
        const result = {
          merge: mergeToggle.checked,
          notes: !!(inputs.notes && inputs.notes.checked),
          folders: !!(inputs.folders && inputs.folders.checked),
          reminders: !!(inputs.reminders && inputs.reminders.checked),
          notifications: !!(inputs.notifications && inputs.notifications.checked),
          settings: !!(inputs.settings && inputs.settings.checked),
        };
        cleanup();
        resolve(result);
      });
    });
  }

  importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.settings) throw new Error('Geçersiz ayar dosyası');

        const replace = await this.showConfirmDialog(
          'Ayarları Değiştir',
          'Ayarları tamamen değiştirmek ister misiniz? (Hayır seçerseniz sadece eksik ayarlar birleştirilecektir)'
        );

        if (replace) {
          Object.keys(data.settings).forEach((k) => localStorage.removeItem(k));
        }

        Object.entries(data.settings).forEach(([k, v]) => {
          // Do NOT import a foreign folderColorsBackup: backups should be local to each installation.
          if (k === 'folderColorsBackup') return;
          // ensure we store everything as strings (localStorage stores strings)
          try {
            localStorage.setItem(k, String(v));
          } catch (e) {
            console.warn('Could not persist imported setting', k, e);
          }
        });

        // Reload settings into UI/state
        this.loadSettings();

        // Reload folders from storage so in-memory folder list is up-to-date
        try {
          await this.loadFolders();
        } catch (e) {
          console.warn('Failed to reload folders before applying accent sync', e);
        }

        // If the imported payload or the current storage indicates folder-accent sync is enabled,
        // force-apply the accent to all folders so they reflect the newly imported accent immediately.
        const importedSyncRaw = data.settings && data.settings.syncFolderAccent;
        const importedAccentRaw = data.settings && data.settings.accentColor;
        const importedSync = importedSyncRaw !== undefined
          ? (String(importedSyncRaw) === '1' || String(importedSyncRaw) === 'true')
          : null;

        const storageSync = localStorage.getItem('syncFolderAccent') === '1';
        const shouldSync = importedSync === null ? storageSync : importedSync;

        const accentToUse = importedAccentRaw || localStorage.getItem('accentColor') || null;

        if (accentToUse) {
          // make sure CSS variables match the imported accent
          this.setAccentColor(accentToUse, { persist: false });
          // persist the accent in storage so applyFolderAccentSync picks it up
          try { localStorage.setItem('accentColor', String(accentToUse)); } catch (e) {}
        }


        if (shouldSync) {
          try {
            // ensure folders are loaded then apply sync
            await this.loadFolders();
            // Create a fresh local backup of current folder colors so disabling sync later
            // will restore the user's original colors (do not use imported backups).
            try {
              const localBackup = {};
              (this.folders || []).forEach((f) => { localBackup[f.id] = f.color; });
              localStorage.setItem('folderColorsBackup', JSON.stringify(localBackup));
            } catch (e) {
              console.warn('Could not create local folder color backup before applying sync', e);
            }

            this.applyFolderAccentSync(true);
          } catch (e) {
            console.warn('Failed to apply folder-accent sync after import', e);
          }
        }

        // Extra safeguard: if sync is enabled and we have an accent, force-overwrite any folder colors
        // to guarantee the UI reflects the imported accent (handles edge cases where backups or
        // other storage entries may have prevented a clean sync).
        if (shouldSync && accentToUse) {
          try {
            this.folders = (this.folders || []).map((f) => ({ ...f, color: String(accentToUse) }));
            await this.saveFolders();
            this.updateFoldersList();
            this.updateFolderNotes();
          } catch (e) {
            console.warn('Failed to force-overwrite folder colors after import', e);
          }
        }

        this.showNotification('Ayarlar başarıyla yüklendi', 'success');
      } catch (err) {
        console.error('Settings import error', err);
        this.showNotification('Ayarlar içe aktarılırken hata oluştu: ' + err.message, 'error');
      }
    });
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  // ============================================
  // SIDEBAR TOGGLE METHODS
  // ============================================

  toggleEditorSidebar() {
    this.isSidebarVisible = !this.isSidebarVisible;

    if (this.isSidebarVisible) {
      this.editorSidebar.classList.remove('hidden');
      this.toggleSidebarBtn.classList.add('active');
    } else {
      this.editorSidebar.classList.add('hidden');
      this.toggleSidebarBtn.classList.remove('active');
    }

    // Save preference
    localStorage.setItem('editorSidebarVisible', this.isSidebarVisible);
  }

  loadSidebarPreference() {
    const savedPreference = localStorage.getItem('editorSidebarVisible');
    if (savedPreference !== null) {
      this.isSidebarVisible = savedPreference === 'true';

      if (this.isSidebarVisible) {
        this.editorSidebar.classList.remove('hidden');
        this.toggleSidebarBtn.classList.add('active');
      } else {
        this.editorSidebar.classList.add('hidden');
        this.toggleSidebarBtn.classList.remove('active');
      }
    } else {
      // Default state - sidebar visible
      this.toggleSidebarBtn.classList.add('active');
    }
  }

  initializeHamburgerIcon() {
    const sidebar = document.getElementById('sidebar');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    if (sidebar && hamburgerBtn) {
      if (sidebar.classList.contains('hidden')) {
        hamburgerBtn.innerHTML = '<i class="fas fa-bars"></i>';
      } else {
        hamburgerBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
      }
    }
  }

  // ============================================
  // FOLDER MANAGEMENT
  // ============================================

  showFolderModal() {
    this._renamingFolderId = null;
    // Ensure modal title/button show create mode
    const titleEl = this.folderModal.querySelector('.modal-title h3');
    const iconEl = this.folderModal.querySelector('.modal-title i');
    const createBtn = document.getElementById('createFolderBtn');
    if (titleEl) titleEl.textContent = window.i18n.t('messages.newFolder');
    if (iconEl) { iconEl.className = 'fas fa-folder-plus'; }
    if (createBtn) createBtn.textContent = window.i18n.t('buttons.create');
    this.folderNameInput.value = '';
    this.showModal(this.folderModal);
    this.folderNameInput.focus();
  }

  hideFolderModal() {
    this.hideModal(this.folderModal);
  }

  renameSelectedFolder() {
    if (!this.selectedFolderId) return;
    const folder = this.folders.find((f) => f.id == this.selectedFolderId);
    if (!folder) return;
    // Pre-fill folder modal and set renaming flag
    this.folderNameInput.value = folder.name;
    this._renamingFolderId = folder.id;
    // Update modal to show rename mode
    const titleEl = this.folderModal.querySelector('.modal-title h3');
    const iconEl = this.folderModal.querySelector('.modal-title i');
    const createBtn = document.getElementById('createFolderBtn');
    if (titleEl) titleEl.textContent = 'Klasörü Yeniden Adlandır';
    if (iconEl) { iconEl.className = 'fas fa-edit'; }
    if (createBtn) createBtn.textContent = 'Kaydet';
    this.showModal(this.folderModal);
    this.folderNameInput.focus();
  }

  async createFolder() {
    const name = this.folderNameInput.value.trim();

    if (!name) {
      this.showNotification('Klasör adı boş olamaz!', 'warning');
      return;
    }

    if (name.length > 50) {
      this.showNotification('Klasör adı çok uzun!', 'warning');
      return;
    }

    // Check if folder name exists
    if (this.folders.some((folder) => folder.name.toLowerCase() === name.toLowerCase())) {
      this.showNotification('Bu isimde bir klasör zaten var!', 'warning');
      return;
    }

    // If we're in rename mode, update the existing folder
    if (this._renamingFolderId) {
      const folder = this.folders.find((f) => f.id == this._renamingFolderId);
      if (folder) {
        folder.name = name;
        await this.saveFolders();
        this.updateFoldersList();
        this.hideFolderModal();
        this.showNotification(`"${name}" olarak yeniden adlandırıldı.`, 'success');
      }
      this._renamingFolderId = null;
      return;
    }

    const folder = {
      id: Date.now() + Math.random(),
      name: name,
      createdAt: new Date().toISOString(),
      color: this.getRandomFolderColor(),
      expanded: true,
    };

    this.folders.push(folder);
    await this.saveFolders();
    this.updateFoldersList();
    this.hideFolderModal();
    this.showNotification(`"${name}" klasörü oluşturuldu!`, 'success');
    if (this.currentFilter === 'favorites') this.updateNotesList();
  }

  getRandomFolderColor() {
    // If sync-to-accent is enabled, return the accent color
    const syncFolders = localStorage.getItem('syncFolderAccent') === '1';
    if (syncFolders) {
      return localStorage.getItem('accentColor') || getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#f59e0b';
    }

    // Extended palette (16 colors)
    const colors = [
      '#3B82F6', // blue
      '#1E40AF', // indigo
      '#06B6D4', // teal
      '#0891B2', // cyan
      '#10B981', // green
      '#065F46', // dark green
      '#84CC16', // lime
      '#F59E0B', // amber
      '#F97316', // orange
      '#EA580C', // deep orange
      '#EF4444', // red
      '#BE185D', // magenta
      '#EC4899', // pink
      '#8B5CF6', // purple
      '#7C3AED', // deep purple
      '#64748B', // slate
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  updateFoldersList() {
    if (!this.foldersList) return;

    this.foldersList.innerHTML = '';

    // Compute visible counts per folder and skip folders with zero visible notes
    const rawSearch = this.searchInput ? String(this.searchInput.value) : '';
    const searchTerm = this.normalizeForSearch(rawSearch);
    const treatAsFilter = this.currentFilter !== 'all' || !!searchTerm;

    this.folders.forEach((folder) => {
      const visibleCount = this.getVisibleCountForFolder(folder.id);
      // If current filter/search should restrict visibility, hide folders with zero visible notes
      if (treatAsFilter && visibleCount === 0) return;
      const folderElement = this.createFolderElement(folder);
      this.foldersList.appendChild(folderElement);
    });
    // Ensure folder notes are populated after rebuilding the DOM
    this.updateFolderNotes();
    // Restore visibility according to header expanded state
    document.querySelectorAll('.folder-notes-container[data-folder-id]').forEach((container) => {
      const folderId = container.getAttribute('data-folder-id');
      const header = document.querySelector(`.folder-item[data-folder-id="${folderId}"]`);
      if (header && header.classList.contains('expanded')) {
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    });
  }

  // Update the visible count badge for a specific folder in the sidebar
  updateFolderCountInDOM(folderId) {
    if (!folderId || folderId === 'default') return;
    const countEl = document.querySelector(`.folder-item[data-folder-id="${folderId}"] .folder-count`);
    if (!countEl) return;
    // Show visible count depending on current filter/search
    const visibleCount = this.getVisibleCountForFolder(folderId);
    countEl.textContent = visibleCount;
    // If current filter or an active search hides empty folders, toggle visibility of the folder container
    const rawSearch = this.searchInput ? String(this.searchInput.value) : '';
    const searchTerm = this.normalizeForSearch(rawSearch);
    const treatAsFilter = this.currentFilter !== 'all' || !!searchTerm;
    if (treatAsFilter) {
      const folderContainer = document.querySelector(`.folder-container:has(.folder-item[data-folder-id="${folderId}"])`);
      // Fallback for environments without :has support
      const fallbackContainer = folderContainer || document.querySelector(`.folder-item[data-folder-id="${folderId}"]`)?.closest('.folder-container');
      if (fallbackContainer) {
        if (visibleCount === 0) {
          // Remove/hide the folder container
          fallbackContainer.style.display = 'none';
        } else {
          fallbackContainer.style.display = '';
        }
      }
    }
  }

  reorderFolders(sourceId, targetId, insertBefore = true) {
    // Normalize ids
    sourceId = String(sourceId);
    targetId = String(targetId);
    const srcIndex = this.folders.findIndex((f) => String(f.id) === sourceId);
    const tgtIndex = this.folders.findIndex((f) => String(f.id) === targetId);
    if (srcIndex === -1 || tgtIndex === -1 || srcIndex === tgtIndex) return;

    const [moved] = this.folders.splice(srcIndex, 1);
    // If removing an earlier item shifts the target index, adjust
    let insertIndex = tgtIndex;
    if (srcIndex < tgtIndex) insertIndex = insertIndex - 1;
    if (!insertBefore) insertIndex = insertIndex + 1;
    // Clamp
    insertIndex = Math.max(0, Math.min(this.folders.length, insertIndex));
    this.folders.splice(insertIndex, 0, moved);

    // Persist and refresh UI
    this.saveFolders();
    this.updateFoldersList();
  }

  // Return how many notes in a folder match current filter and search
  getVisibleCountForFolder(folderId) {
    // Use loose equality to tolerate string/number id differences coming from DOM attributes
    let folderNotes = this.notes.filter((n) => n.folderId == folderId);

    // Apply current filter
    switch (this.currentFilter) {
      case 'today':
        const today = new Date().toDateString();
        folderNotes = folderNotes.filter((note) => new Date(note.createdAt).toDateString() === today);
        break;
      case 'favorites':
        folderNotes = folderNotes.filter((note) => note.isFavorite);
        break;
      default:
        // 'all' or other filters: keep folderNotes as-is
        break;
    }

    // Apply search
    const rawSearch = this.searchInput ? String(this.searchInput.value) : '';
    const searchTerm = this.normalizeForSearch(rawSearch);
    if (searchTerm) {
      // If the folder name itself matches the search term, consider the folder visible and
      // include all its notes (still respecting the current filter like 'today' or 'favorites').
      const folderObj = this.folders.find((f) => f.id == folderId);
      const folderNameMatches = folderObj && this.normalizeForSearch(folderObj.name || '').includes(searchTerm);
      if (!folderNameMatches) {
        folderNotes = folderNotes.filter((note) => this.noteMatchesSearch(note, searchTerm));
      }
    }

    return folderNotes.length;
  }

  createFolderElement(folder) {
    const container = document.createElement('div');
    container.className = 'folder-container';

    const folderHeader = document.createElement('div');
    folderHeader.className = 'nav-item folder-item nav-expandable expanded';
    folderHeader.setAttribute('data-folder-id', folder.id);

    const noteCount = this.notes.filter((note) => note.folderId === folder.id).length;

    folderHeader.innerHTML = `
            <i class="fas fa-folder nav-icon" style="color: ${folder.color}"></i>
            <span class="nav-text">${this.escapeHtml(folder.name)}</span>
            <span class="folder-count">${noteCount}</span>
            <i class="fas fa-chevron-down nav-expand"></i>
        `;

    // Create notes container for this folder
    const notesContainer = document.createElement('div');
    notesContainer.className = 'folder-notes-container';
    notesContainer.setAttribute('data-folder-id', folder.id);

    // Add expandable functionality - only expand/collapse, no filtering
    // Initialize expanded state from folder.expanded
    const chevron = folderHeader.querySelector('.nav-expand');
    if (folder.expanded) {
      folderHeader.classList.add('expanded');
      notesContainer.style.display = 'block';
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    } else {
      folderHeader.classList.remove('expanded');
      notesContainer.style.display = 'none';
      if (chevron) chevron.style.transform = 'rotate(-90deg)';
    }

    folderHeader.addEventListener('click', async (e) => {
      e.preventDefault();
      folderHeader.classList.toggle('expanded');
      if (folderHeader.classList.contains('expanded')) {
        notesContainer.style.display = 'block';
        if (chevron) chevron.style.transform = 'rotate(0deg)';
        folder.expanded = true;
      } else {
        notesContainer.style.display = 'none';
        if (chevron) chevron.style.transform = 'rotate(-90deg)';
        folder.expanded = false;
      }
      // persist the expanded state
      await this.saveFolders();
    });

    // Add right-click context menu
    folderHeader.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showFolderContextMenu(e.clientX, e.clientY, folder.id);
    });

    container.appendChild(folderHeader);
    container.appendChild(notesContainer);

    // Add drop event listeners to folder header
    // Make folder header draggable so folders can be reordered
    folderHeader.draggable = true;
    folderHeader.addEventListener('dragstart', (ev) => {
      try {
        ev.dataTransfer.effectAllowed = 'move';
        // Use a dedicated mime type for folder drags to avoid colliding with note drags
        ev.dataTransfer.setData('text/folder-id', String(folder.id));
        // add a dragging class to aid styling (optional)
        folderHeader.classList.add('dragging');
      } catch (err) {
        // ignore
      }
    });
    folderHeader.addEventListener('dragend', () => {
      folderHeader.classList.remove('dragging');
      // remove any drag-over / insert indicator classes left behind
      document
        .querySelectorAll('.folder-item.drag-over, .folder-item.insert-before, .folder-item.insert-after, .default-folder.drag-over, .default-folder.insert-before, .default-folder.insert-after')
        .forEach((el) => el.classList.remove('drag-over', 'insert-before', 'insert-after'));
    });
    folderHeader.addEventListener('dragover', (e) => {
      e.preventDefault();
      // detect if the active drag is a folder (we set 'text/folder-id' during dragstart)
      const types = e.dataTransfer && e.dataTransfer.types ? Array.from(e.dataTransfer.types) : [];
      let isFolderDrag = false;
      try {
        isFolderDrag = types.includes('text/folder-id') || Boolean(e.dataTransfer.getData && e.dataTransfer.getData('text/folder-id'));
      } catch (err) {
        // accessing getData during dragover can throw in some browsers; fallback to types check only
        isFolderDrag = types.includes('text/folder-id');
      }

      // decide whether insertion would be before or after based on cursor position
      // but use the entire folder container (header + notes) so we don't allow inserting between header and its notes
      const containerRect = container.getBoundingClientRect();
      const headerRect = folderHeader.getBoundingClientRect();
      const edgeThreshold = Math.max(8, Math.min(20, headerRect.height / 2));

      const nearTop = (e.clientY - containerRect.top) <= edgeThreshold;
      const nearBottom = (containerRect.bottom - e.clientY) <= edgeThreshold;

      const siblings = Array.from(folderHeader.parentElement.querySelectorAll('.folder-item, .default-folder'));

      // find the currently dragging folder element (if any) and avoid setting insertion classes on it
      const draggingEl = document.querySelector('.folder-item.dragging, .default-folder.dragging');
      if (folderHeader === draggingEl) {
        // If hovering over the element being dragged, clear any insertion cues and do nothing
        folderHeader.classList.remove('drag-over', 'insert-before', 'insert-after');
        return;
      }

      if (isFolderDrag) {
        // For folder drag, show only the thin insertion line (insert-before/after) when cursor is near
        // the top or bottom edge of the whole folder container. Do not show insertion when hovering over notes.
        folderHeader.classList.remove('drag-over');
          if (nearTop) {
          folderHeader.classList.add('insert-before');
          folderHeader.classList.remove('insert-after');
        } else if (nearBottom) {
          folderHeader.classList.add('insert-after');
          folderHeader.classList.remove('insert-before');
        } else {
          // in the middle of the folder (over notes) - hide insertion cues
          folderHeader.classList.remove('insert-before', 'insert-after');
        }

        siblings.forEach((s) => {
          if (s !== folderHeader && s !== draggingEl) {
            s.classList.remove('insert-before', 'insert-after', 'drag-over');
          }
        });
      } else {
        // For other drags (notes), preserve the previous behavior: show dashed border and no insertion line
        folderHeader.classList.add('drag-over');
        folderHeader.classList.remove('insert-before', 'insert-after');
        siblings.forEach((s) => {
          if (s !== folderHeader && s !== draggingEl) {
            s.classList.remove('insert-before', 'insert-after');
          }
        });
      }
    });

    folderHeader.addEventListener('dragleave', () => {
      folderHeader.classList.remove('drag-over', 'insert-before', 'insert-after');
    });

    folderHeader.addEventListener('drop', (e) => {
      e.preventDefault();
      folderHeader.classList.remove('drag-over');
      // First check for folder reorder payload
      const draggedFolderId = e.dataTransfer.getData('text/folder-id');
      if (draggedFolderId) {
        const sourceId = String(draggedFolderId);
        const targetId = String(folder.id);
        // If the dragged folder is the same DOM element as the target, ignore
        const draggingEl = document.querySelector('.folder-item.dragging, .default-folder.dragging');
        const targetEl = folderHeader;
        if (draggingEl && (draggingEl === targetEl || String(draggingEl.getAttribute('data-folder-id')) === sourceId && String(targetEl.getAttribute('data-folder-id')) === sourceId)) {
          // cleanup and ignore
          folderHeader.classList.remove('drag-over', 'insert-before', 'insert-after');
          return;
        }

        if (sourceId !== targetId) {
          // Determine whether to insert before or after based on mouse position relative to the whole container
          const containerRect = container.getBoundingClientRect();
          const headerRect = folderHeader.getBoundingClientRect();
          const edgeThreshold = Math.max(8, Math.min(20, headerRect.height / 2));
          const nearTop = (e.clientY - containerRect.top) <= edgeThreshold;
          const nearBottom = (containerRect.bottom - e.clientY) <= edgeThreshold;

          let insertBefore = false;
          if (nearTop) insertBefore = true;
          else if (nearBottom) insertBefore = false;
          else {
            // If not near top/bottom, ignore the drop as an insertion — default to no-op
            folderHeader.classList.remove('drag-over', 'insert-before', 'insert-after');
            return;
          }

          // cleanup visual classes
          folderHeader.classList.remove('drag-over', 'insert-before', 'insert-after');
          this.reorderFolders(sourceId, targetId, insertBefore);
        }
        return;
      }

      // Otherwise assume a note was dropped onto this folder
      const noteId = e.dataTransfer.getData('text/plain');
      if (noteId) {
        this.moveNoteToFolder(parseInt(noteId), folder.id);
      }
    });

    return container;
  }

  createFolderNoteElement(note) {
    const div = document.createElement('div');
    // Keep folder-note-item but also include note-item so styles and actions match main list
    div.className = 'nav-subitem folder-note-item note-item fade-in';
    div.draggable = true;
    div.setAttribute('data-note-id', note.id);

    // Reflect pinned/locked state on the container so CSS selectors like
    // .folder-note-item.pinned and .folder-note-item.locked apply correctly.
    if (note.isPinned) div.classList.add('pinned');
    if (note.isLocked) div.classList.add('locked');

    if (this.currentNote && this.currentNote.id === note.id) {
      div.classList.add('active');
    }

    const title = note.title || 'Başlıksız Not';
    const truncatedTitle = title.length > 15 ? title.substring(0, 15) + '...' : title;

    div.innerHTML = `
            <i class="fas fa-file-alt nav-icon"></i>
            <span class="nav-text note-item-title">${this.escapeHtml(truncatedTitle)}</span>
            <div class="note-item-actions">
                <button class="note-action-btn favorite-btn ${note.isFavorite ? 'favorited' : ''}" 
                        data-note-id="${note.id}"
                        title="${note.isFavorite ? window.i18n.t('messages.removeFromFavorites') : window.i18n.t('messages.addToFavorites')}">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="note-action-btn pin-btn ${note.isPinned ? 'pinned' : ''}" 
                        data-note-id="${note.id}"
                        title="${note.isPinned ? window.i18n.t('messages.unpinNote') : window.i18n.t('messages.pinNote')}">
                    <i class="fas fa-thumbtack"></i>
                </button>
                <button class="note-action-btn lock-btn ${note.isLocked ? 'locked' : ''}" 
                        data-note-id="${note.id}"
                        title="${note.isLocked ? window.i18n.t('messages.unlockNote') : window.i18n.t('messages.lockNote')}">
                    <i class="fas fa-lock"></i>
                </button>
                <button class="note-action-btn delete-btn" 
                        data-note-id="${note.id}"
                        title="${window.i18n.t('messages.deleteNote')}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

    // Click selects note unless an action button was clicked
    div.addEventListener('click', (e) => {
      if (!e.target.closest('.note-action-btn')) {
        this.selectNote(note);
      }
    });

    // Wire action buttons
    const favoriteBtn = div.querySelector('.favorite-btn');
    const pinBtn = div.querySelector('.pin-btn');
    const lockBtn = div.querySelector('.lock-btn');
    const deleteBtn = div.querySelector('.delete-btn');

    favoriteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFavorite(note.id);
    });

    pinBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePin(note.id);
    });

    lockBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleLock(note.id);
    });

    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteNoteById(note.id);
    });

    // Drag events
    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', note.id);
      div.classList.add('dragging');
    });

    div.addEventListener('dragend', () => {
      div.classList.remove('dragging');
    });

    // Hover title truncation behavior
    const titleElement = div.querySelector('.note-item-title');
    const originalTitle = title;
    const hoverTruncated = title.length > 6 ? title.substring(0, 6) + '...' : title;

    div.addEventListener('mouseenter', () => {
      if (titleElement) titleElement.textContent = hoverTruncated;
    });

    div.addEventListener('mouseleave', () => {
      if (titleElement) titleElement.textContent = originalTitle;
    });

    return div;
  }

  async moveNoteToFolder(noteId, folderId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;

    const oldFolderId = note.folderId || 'default';
    // No-op if nothing changed
    if (oldFolderId === (folderId || 'default')) return;

    note.folderId = folderId;
    note.updatedAt = new Date().toISOString();

    try {
      await this.saveNotes();

      // Remove any existing DOM nodes representing this note (main list and folder lists)
      const mainNoteEl = document.querySelector(`.note-item[data-note-id="${noteId}"]`);
      if (mainNoteEl && mainNoteEl.parentElement) mainNoteEl.parentElement.removeChild(mainNoteEl);

      document.querySelectorAll(`.folder-note-item[data-note-id="${noteId}"]`).forEach((el) => {
        if (el && el.parentElement) el.parentElement.removeChild(el);
      });

      // Determine current search/filter so we only insert the note where it should be visible
      const rawSearch = this.searchInput ? String(this.searchInput.value) : '';
      const searchTerm = this.normalizeForSearch(rawSearch);

      // Update folder count badges for old and new folders
      if (oldFolderId && oldFolderId !== 'default') this.updateFolderCountInDOM(oldFolderId);
      if (folderId && folderId !== 'default') this.updateFolderCountInDOM(folderId);

      // Insert into destination if it should be visible under current filter/search
      if (folderId && folderId !== 'default') {
        const folderContainer = document.querySelector(`.folder-notes-container[data-folder-id="${folderId}"]`);
        if (folderContainer) {
          // Respect current filter (today/favorites) and search
          let visible = true;
          if (this.currentFilter === 'today') {
            visible = new Date(note.createdAt).toDateString() === new Date().toDateString();
          } else if (this.currentFilter === 'favorites') {
            visible = !!note.isFavorite;
          }
          if (searchTerm) visible = visible && this.noteMatchesSearch(note, searchTerm);

          if (visible) {
            const newEl = this.createFolderNoteElement(note);
            folderContainer.appendChild(newEl);
          }
        }
      } else {
        // Moved to main list
        let visible = true;
        if (this.currentFilter === 'today') {
          visible = new Date(note.createdAt).toDateString() === new Date().toDateString();
        } else if (this.currentFilter === 'favorites') {
          visible = !!note.isFavorite;
        } else {
          // default: only notes without folder are shown in main list
          visible = !note.folderId || note.folderId === 'default';
        }
        if (searchTerm) visible = visible && this.noteMatchesSearch(note, searchTerm);

        if (visible && this.notesList) {
          const newEl = this.createNoteElement(note);
          // Prepend to keep recent ordering without rebuilding entire list
          this.notesList.insertBefore(newEl, this.notesList.firstChild);
        }
      }

      // Update any action-button states that may appear in multiple places
      this.updateActionButtonStates(noteId);

      // If viewing a special filter that depends on membership (favorites), refresh the view
      if (this.currentFilter === 'favorites') this.updateNotesList();
    } catch (error) {
      console.error('Hata: not taşıma sırasında', error);
      // Fallback: ensure consistent UI by falling back to full updates
      this.updateNotesList();
      this.updateFoldersList();
    }

    const folderName =
      folderId === 'default'
        ? 'Notlar'
        : this.folders.find((f) => f.id === folderId)?.name || 'Bilinmeyen Klasör';
    this.showNotification(`"${note.title || 'Başlıksız not'}" ${folderName} klasörüne taşındı`, 'success');
  }

  // Action button functions
  async toggleFavorite(noteId) {
    const note = this.notes.find((n) => n.id == noteId);
    if (!note) return;

    note.isFavorite = !note.isFavorite;
    note.updatedAt = new Date().toISOString();

    await this.saveNotes();

    // Update all instances of this note's action buttons
    this.updateActionButtonStates(noteId);

    // Only update the specific folder if note is in a folder, otherwise update main list
    if (note.folderId && note.folderId !== 'default') {
      this.updateSpecificFolder(note.folderId);
    } else {
      this.updateNotesList();
    }
  // Keep the current filter selected after toggling metadata

    const message = note.isFavorite ? window.i18n.t('messages.addedToFavorites') : window.i18n.t('messages.removedFromFavorites');
    this.showNotification(message, 'success');
  }

  updateActionButtonStates(noteId) {
    const note = this.notes.find((n) => n.id == noteId);
    if (!note) return;

    // Find all instances of this note in DOM (main list and folders)
    const noteElements = document.querySelectorAll(`[data-note-id="${noteId}"]`);

    noteElements.forEach((noteElement) => {
      const favoriteBtn = noteElement.querySelector('.favorite-btn');
      const pinBtn = noteElement.querySelector('.pin-btn');
      const lockBtn = noteElement.querySelector('.lock-btn');

      // Update favorite button
      if (favoriteBtn) {
        if (note.isFavorite) {
          favoriteBtn.classList.add('favorited');
        } else {
          favoriteBtn.classList.remove('favorited');
        }
      }

      // Update pin button
      if (pinBtn) {
        if (note.isPinned) {
          pinBtn.classList.add('pinned');
        } else {
          pinBtn.classList.remove('pinned');
        }
      }

      // Update lock button
      if (lockBtn) {
        if (note.isLocked) {
          lockBtn.classList.add('locked');
        } else {
          lockBtn.classList.remove('locked');
        }
      }
    });
  }

  updateSpecificFolder(folderId) {
    const folderContainer = document.querySelector(
      `.folder-notes-container[data-folder-id="${folderId}"]`
    );
    if (!folderContainer) return;

    folderContainer.innerHTML = '';
    let folderNotes = this.notes.filter((note) => note.folderId == folderId);

    // Apply current filter to folder notes
    switch (this.currentFilter) {
      case 'today':
        const today = new Date().toDateString();
        folderNotes = folderNotes.filter(
          (note) => new Date(note.createdAt).toDateString() === today
        );
        break;
      case 'favorites':
        folderNotes = folderNotes.filter((note) => note.isFavorite);
        break;
      // default durumunda tüm klasör notlarını göster
    }

    // Apply search filter to folder notes (use normalized search helper)
    const rawSearchLocal = this.searchInput ? String(this.searchInput.value) : '';
    const searchTermLocal = this.normalizeForSearch(rawSearchLocal);
    if (searchTermLocal) {
      folderNotes = folderNotes.filter(
        (note) =>
          this.normalizeForSearch(note.title || '').includes(searchTermLocal) ||
          this.normalizeForSearch(note.content || '').includes(searchTermLocal) ||
          (note.tags || []).some((tag) => this.normalizeForSearch(tag).includes(searchTermLocal))
      );
    }

    const sortedFolderNotes = this.getSortedNotes(folderNotes);
    sortedFolderNotes.forEach((note) => {
      const noteElement = this.createFolderNoteElement(note);
      folderContainer.appendChild(noteElement);
    });

    // If no visible notes in the folder under current filter/search, hide the entire folder container
    const rawSearch = this.searchInput ? String(this.searchInput.value) : '';
    const searchTerm = this.normalizeForSearch(rawSearch);
    const treatAsFilter = this.currentFilter !== 'all' || !!searchTerm;
    const visibleCount = this.getVisibleCountForFolder(folderId);
    const folderWrapper = folderContainer.closest('.folder-container');
    if (folderWrapper) {
      if (treatAsFilter && visibleCount === 0) {
        folderWrapper.style.display = 'none';
      } else {
        folderWrapper.style.display = '';
      }
    }
  }

  async togglePin(noteId) {
    const note = this.notes.find((n) => n.id == noteId);
    if (!note) return;

    // If trying to pin and already 3 notes are pinned, block and notify
    if (!note.isPinned) {
      const pinnedCount = this.notes.filter((n) => n.isPinned).length;
      const maxPinned = parseInt(localStorage.getItem('maxPinnedNotes'), 10) || 3;
      if (pinnedCount >= maxPinned) {
        this.showNotification(window.i18n.t('messages.maxPinnedNotes').replace('{count}', maxPinned), 'error');
        return;
      }
    }

    note.isPinned = !note.isPinned;
    note.updatedAt = new Date().toISOString();

    await this.saveNotes();

    // Update all instances of this note's action buttons
    this.updateActionButtonStates(noteId);

    // Only update the specific folder if note is in a folder, otherwise update main list
    if (note.folderId && note.folderId !== 'default') {
      this.updateSpecificFolder(note.folderId);
    } else {
      this.updateNotesList();
    }

    // If viewing favorites, refresh it to reflect pin changes where applicable
    if (this.currentFilter === 'favorites') this.updateNotesList();

    const message = note.isPinned ? window.i18n.t('messages.notePinned') : window.i18n.t('messages.noteUnpinned');
    this.showNotification(message, 'success');
  }

  async toggleLock(noteId) {
    const note = this.notes.find((n) => n.id == noteId);
    if (!note) return;

    if (note.isLocked) {
      // Unlock note - ask for password
      const password = await this.showPasswordModal(window.i18n.t('messages.enterPasswordToOpen'));
      if (!password) return;

      // For now, any password unlocks (you can add proper password validation)
      note.isLocked = false;
      this.showNotification(window.i18n.t('messages.noteUnlocked'), 'success');
    } else {
      // Lock note - ask for password
      const password = await this.showPasswordModal(window.i18n.t('messages.setPasswordForNote'));
      if (!password) return;

      note.isLocked = true;
      note.password = password; // In real app, this should be hashed
      this.showNotification(window.i18n.t('messages.noteLocked'), 'success');
    }

    note.updatedAt = new Date().toISOString();
    await this.saveNotes();

    // Update all instances of this note's action buttons
    this.updateActionButtonStates(noteId);

    // Only update the specific folder if note is in a folder, otherwise update main list
    if (note.folderId && note.folderId !== 'default') {
      this.updateSpecificFolder(note.folderId);
    } else {
      this.updateNotesList();
    }
    if (this.currentFilter === 'favorites') this.updateNotesList();
  }

  // Context menu functions
  showFolderContextMenu(x, y, folderId) {
    this.selectedFolderId = folderId;

    // Position the context menu
    this.contextMenu.style.left = x + 'px';
    this.contextMenu.style.top = y + 'px';
    this.contextMenu.classList.remove('hidden');
  }

  hideContextMenu() {
    this.contextMenu.classList.add('hidden');
    this.selectedFolderId = null;
  }

  deleteSelectedFolder() {
    if (!this.selectedFolderId) return;

    const folder = this.folders.find((f) => f.id == this.selectedFolderId);
    if (!folder) return;

  // Count notes that truly belong to this folder. Treat falsy or 'default' folderIds as folderless.
  const notesInFolder = this.notes.filter((note) => note.folderId && String(note.folderId) === String(this.selectedFolderId));
    const noteCount = notesInFolder.length;

    const message =
      noteCount > 0
        ? `"${folder.name}" klasörü ve içindeki ${noteCount} not kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`
        : `"${folder.name}" klasörü silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`;

    this.confirmMessage.textContent = message;

    // Store folderId locally before hiding context menu
    const folderIdToDelete = this.selectedFolderId;

    this.confirmCallback = () => {
  // Delete all notes that truly belong to the folder (ignore folderless notes)
  const notesToRemove = this.notes.filter((note) => note.folderId && String(note.folderId) === String(folderIdToDelete)).map(n => String(n.id));
  const removedSet = new Set(notesToRemove);

  // Keep notes that are NOT in the selected folder (preserve folderless notes and other folders)
  this.notes = this.notes.filter((note) => !(note.folderId && String(note.folderId) === String(folderIdToDelete)));

      // Delete the folder
      this.folders = this.folders.filter((f) => f.id != folderIdToDelete);

      // Remove reminders and notifications associated with deleted notes
      try {
        if (Array.isArray(this.reminders) && this.reminders.length > 0) {
          this.reminders = this.reminders.filter(r => {
            if (!r.noteId && r.noteId !== 0) return true;
            return !removedSet.has(String(r.noteId));
          });
          this.saveReminders();
          this.updateRemindersView();
        }
      } catch (e) { console.warn('Failed to cleanup reminders after deleting folder', e); }

      try {
        if (Array.isArray(this.notifications) && this.notifications.length > 0) {
          this.notifications = this.notifications.filter(n => {
            if (!n.noteId && n.noteId !== 0) return true;
            return !removedSet.has(String(n.noteId));
          });
          this.saveNotifications();
          this.updateNotificationsView();
        }
      } catch (e) { console.warn('Failed to cleanup notifications after deleting folder', e); }

      // Save and update
      this.saveNotes();
      this.saveFolders();
  // Ensure stats updated after deleting single folder
  try { this.updateStats(); } catch (e) {}
      this.updateFoldersList();
      this.updateStats();
      if (this.currentFilter === 'favorites') this.updateNotesList();

      // Clear selection if current note was in deleted folder
      if (this.currentNote && this.currentNote.folderId == folderIdToDelete) {
        this.currentNote = null;
        this.showWelcome();
      }

      try { this.updateActiveRemindersCount(); } catch (e) {}
      try { this.updateActiveNotificationsCount(); } catch (e) {}

      this.showNotification(`"${folder.name}" klasörü ve içindeki notlar silindi`, 'success');
    };

    this.hideContextMenu();
    this.showModal(this.confirmModal);
  }

  openFolderColorPicker() {
    // Deprecated: use modal-based picker instead
    this.openFolderColorModal();
  }

  openFolderColorModal() {
    if (!this.selectedFolderId) return;
    const folder = this.folders.find((f) => f.id == this.selectedFolderId);
    if (!folder) return;
    // Prefill modal input with current folder color
    if (this.folderColorInput) this.folderColorInput.value = folder.color || '#3B82F6';
    // Store the folder id on the hidden picker so the save handler can find it
    if (this.folderColorPicker) this.folderColorPicker.dataset.folderId = folder.id;
    this.showModal(this.folderColorModal);
  }

  applySelectedFolderColor(color) {
    const folderId = this.selectedFolderId || (this.folderColorPicker && this.folderColorPicker.dataset.folderId);
    if (!folderId) return;
    const folder = this.folders.find((f) => f.id == folderId);
    if (!folder) return;
    folder.color = color;
    // Persist the color change
    this.saveFolders();
    // Update only the folder header icon in the DOM to avoid re-rendering the entire notes list
    this.updateFolderColorInDOM(folderId, color);
    this.showNotification(window.i18n.t('messages.folderColorUpdated'), 'success');
    // Clean up the dataset to avoid stale ids
    try {
      if (this.folderColorPicker) delete this.folderColorPicker.dataset.folderId;
    } catch (e) {}
  }

  updateFolderColorInDOM(folderId, color) {
    try {
      // Update all folder header icons for this folder id (force priority to override CSS rules)
      const headers = document.querySelectorAll(`.folder-item[data-folder-id="${folderId}"]`);
      headers.forEach((header) => {
        const icons = header.querySelectorAll('.nav-icon');
        icons.forEach((icon) => {
          try {
            // set with priority to override any stylesheet rules
            icon.style.setProperty('color', color, 'important');
            icon.style.opacity = '';
          } catch (e) {
            icon.style.color = color;
          }
        });
      });

      // Intentionally do NOT change icons of notes inside the folder.
      // Only folder header icons should change to reflect folder color.
    } catch (e) {
      // fallback: if DOM update fails, do full refresh
      this.updateFoldersList();
      this.updateFolderNotes();
    }
  }

  updateDynamicTranslations() {
    // Re-trigger count updates to use new translations
    if (this.currentNote) {
      // Update editor counts
      this.updateCount();
      
      // Update current date display
      this.updateCurrentDate();
      
      // Update note reminders text if visible
      if (this.noteRemindersList) {
        const noteReminders = this.reminders.filter(r => 
          r.noteId === this.currentNote.id && 
          !r.dismissed && 
          new Date(r.datetime) > new Date()
        );
        
        if (noteReminders.length === 0) {
          this.noteRemindersList.innerHTML = `<div class="note-no-reminder">${window.i18n.t('stats.noReminder')}</div>`;
        }
      }
      
      // Update history modal if open
      if (this.historyModal && !this.historyModal.classList.contains('hidden')) {
        this.showHistory();
      }
    }
    
    // Update viewer stats if a note is being viewed
    const viewerActive = document.querySelector('.viewer.active');
    if (viewerActive && this.viewingNote) {
      const counts = this.countWordsAndCharsFromHtml(this.viewingNote.content || '');
      if (this.viewerWordCount) this.viewerWordCount.textContent = `${counts.words} ${window.i18n.t('stats.words')}`;
      if (this.viewerCharCount) this.viewerCharCount.textContent = `${counts.chars} ${window.i18n.t('stats.characters')}`;
      
      const WPM = 200;
      if (!counts.words) {
        this.readingTime.textContent = `0 ${window.i18n.t('stats.readingTime')}`;
      } else {
        const seconds = Math.ceil((counts.words / WPM) * 60);
        if (seconds < 60) {
          this.readingTime.textContent = `~${seconds} ${window.i18n.t('stats.readingTimeSeconds')}`;
        } else {
          const minutes = Math.round(seconds / 60);
          this.readingTime.textContent = `~${minutes} ${window.i18n.t('stats.readingTime')}`;
        }
      }
      
      // Update viewer dates
      const locale = window.i18n.currentLanguage === 'en' ? 'en-US' : 'tr-TR';
      const createdDate = new Date(this.viewingNote.createdAt);
      const updatedDate = new Date(this.viewingNote.updatedAt);
      
      if (this.viewerDate) {
        this.viewerDate.textContent = createdDate.toLocaleDateString(locale, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      
      if (this.lastModified) {
        this.lastModified.textContent = updatedDate.toLocaleString(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CapnoteApp();
});

// Export for global access
window.CapnoteApp = CapnoteApp;
