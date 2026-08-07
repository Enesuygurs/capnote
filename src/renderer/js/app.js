// Capnote renderer: the application class. Feature methods live in ./features and are mixed in below.

import { applyFeatures } from './mixin.js';
import { HtmlFeature } from './features/html.js';
import { StorageFeature } from './features/storage.js';
import { SettingsFeature } from './features/settings.js';
import { LockFeature } from './features/lock.js';
import { NotesFeature } from './features/notes.js';
import { ScreensFeature } from './features/screens.js';
import { ViewerFeature } from './features/viewer.js';
import { EditorFeature } from './features/editor.js';
import { EditorFormattingFeature } from './features/editor-formatting.js';
import { EditorInsertFeature } from './features/editor-insert.js';
import { PreviewsFeature } from './features/previews.js';
import { EmojiFeature } from './features/emoji.js';
import { NoteListFeature } from './features/note-list.js';
import { FoldersFeature } from './features/folders.js';
import { RemindersFeature } from './features/reminders.js';
import { NotificationsFeature } from './features/notifications.js';
import { TodosFeature } from './features/todos.js';
import { UiFeature } from './features/ui.js';
import { ExportFeature } from './features/export.js';
import { BackupFeature } from './features/backup.js';
import { AttachmentsFeature } from './features/attachments.js';

export class CapnoteApp {
  constructor() {
    this.currentNote = null;
    this.notes = [];
    this.folders = [];
    this.reminders = []; // Array of {id, noteId, datetime, noteTitle, dismissed}
    this.notifications = []; // Array of {id, noteId, noteTitle, message, time, read}
    this.todoSections = []; // Array of {id, name, todos: [{id, text, completed, createdAt}]}
    this.currentFilter = 'all';
    this.currentSort = 'date-desc';
    this.selectedMood = null;
    this.selectedWeather = null;
    this.tags = [];
    this.originalNoteState = null;
    this.isResizing = false; // Flag to prevent re-renders during resize
    // Passwords of locked notes unlocked in this session (memory only, never persisted)
    this.unlockedNotes = new Map();
    // Latest re-encryption request per note, so an older result never overwrites a newer one
    this.sealRequests = new WeakMap();

    this.defaultFormatting = {
      fontFamily: 'Inter',
      fontSize: '14px',
    };
    this.baseFormatting = { ...this.defaultFormatting };
    this.savedSelection = null;

    this.init();
  }

  async init() {
    // Add platform class to body for platform-specific styling
    if (window.electronAPI && window.electronAPI.platform) {
      document.body.classList.add(`platform-${window.electronAPI.platform}`);
    }

    // Wait for i18n to be ready (resolves even when translations failed to load)
    if (window.i18n && window.i18n.ready) {
      await window.i18n.ready;
    }

    await this.initStorage();
    window.i18n.setLanguage(this.settings.language);
    await this.loadNotes();
    await this.loadReminders();
    await this.loadNotifications();
    await this.loadTodos();
    this.initializeElements();
    this.setupEventListeners();
    this.setupSettingsEventListeners();
    this.setupResizeOptimization();
    this.loadSettings();
    window.electronAPI?.setLanguage?.(window.i18n.getLanguage());
    this.loadSidebarPreference();
    this.initializeHamburgerIcon();
    this.updateUI();
    this.updateStats();
    this.updateTodosCount();
    this.startReminderChecker();
    this.cleanupUploads();

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

    // Todos elements
    this.todosScreen = document.getElementById('todosScreen');
    this.todosNav = document.getElementById('todosNav');
    this.todosSectionsContainer = document.getElementById('todosSectionsContainer');
    this.todoSectionInput = document.getElementById('todoSectionInput');
    this.addTodoSectionBtn = document.getElementById('addTodoSectionBtn');
    this.todosCount = document.getElementById('todosCount');

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
    this.filterTabs = document.querySelectorAll('.nav-item[data-filter]');

    // Notes list container
    this.notesListContainer = document.getElementById('notesListContainer');

    // Modal elementler
    this.confirmModal = document.getElementById('confirmModal');
    this.confirmBtn = document.getElementById('confirmBtn');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.confirmMessage = document.getElementById('confirmMessage');
    this.exportModal = document.getElementById('exportModal');
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
    // General settings
    this.onNoteDeleteSelect = document.getElementById('onNoteDeleteSelect');
    this.confirmDeleteToggle = document.getElementById('confirmDeleteToggle');
    this.autoSaveToggle = document.getElementById('autoSaveToggle');

    // Folder elements
    this.addFolderBtn = document.getElementById('addFolderBtn');
    this.folderModal = document.getElementById('folderModal');
    this.folderNameInput = document.getElementById('folderNameInput');
    this.createFolderBtn = document.getElementById('createFolderBtn');
    this.cancelFolderBtn = document.getElementById('cancelFolderBtn');
    this.foldersList = document.getElementById('foldersList');
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
    // Close note option menus when clicking outside or scrolling
    const closeMenus = () => {
      document.querySelectorAll('.note-options-menu:not(.hidden)').forEach((menu) => {
        menu.classList.add('hidden');
        menu.style.display = 'none';
      });
      document.querySelectorAll('.note-options-container.menu-open').forEach((container) => {
        container.classList.remove('menu-open');
      });
    };

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.note-options-container')) {
        closeMenus();
      }
    });

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
        if (window.i18n) {
          window.i18n.setLanguage(lang);
          this.setSetting('language', lang);
          window.electronAPI?.setLanguage?.(lang);
          this.showNotification(window.i18n.t('messages.languageChanged'), 'success');
          // Update dynamic content that may not have data-i18n attributes
          this.updateDynamicTranslations();
        }
      });
    }

    // Accent swatches
    this.accentYellowBtn?.addEventListener('click', (e) =>
      this.setAccentColor(e.currentTarget.dataset.color || '#f59e0b')
    );
    this.accentCherryBtn?.addEventListener('click', (e) =>
      this.setAccentColor(e.currentTarget.dataset.color || '#e11d48')
    );
    this.accentAppleBtn?.addEventListener('click', (e) =>
      this.setAccentColor(e.currentTarget.dataset.color || '#22c55e')
    );
    this.accentPurpleBtn?.addEventListener('click', (e) =>
      this.setAccentColor(e.currentTarget.dataset.color || '#8b5cf6')
    );
    this.accentBlueBtn?.addEventListener('click', (e) =>
      this.setAccentColor(e.currentTarget.dataset.color || '#3b82f6')
    );
    this.syncFolderAccentToggle?.addEventListener('change', (e) => {
      const enabled = e.currentTarget.checked;
      this.setSetting('syncFolderAccent', enabled);
      this.applyFolderAccentSync(enabled);
      this.updateFoldersList();
    });

    // Native/system notifications toggle
    this.toggleNativeNotifications?.addEventListener('change', (e) => {
      const enabled = e.currentTarget.checked;
      this.setSetting('nativeNotifications', enabled);
      this.showNotification(
        enabled
          ? window.i18n.t('messages.systemNotificationsEnabled')
          : window.i18n.t('messages.systemNotificationsDisabled'),
        'success'
      );
    });
    // Start at login toggle
    this.startAtLoginToggle?.addEventListener('change', async (e) => {
      try {
        const enabled = !!e.currentTarget.checked;
        if (window.electronAPI && typeof window.electronAPI.setStartAtLogin === 'function') {
          const res = await window.electronAPI.setStartAtLogin(enabled);
          if (!res || res.ok !== true)
            throw new Error(res && res.error ? res.error : 'Bilinmeyen hata');
          this.showNotification(
            enabled
              ? window.i18n.t('messages.launchOnStartupEnabled')
              : window.i18n.t('messages.launchOnStartupDisabled'),
            'success'
          );
        }
      } catch (err) {
        console.warn('setStartAtLogin failed:', err);
        // revert checkbox
        if (this.startAtLoginToggle)
          this.startAtLoginToggle.checked = !this.startAtLoginToggle.checked;
        this.showNotification(window.i18n.t('messages.launchOnStartupError'), 'error');
      }
    });
    // Close to tray toggle: only wire on Windows (hide on macOS/Linux)
    try {
      const plat =
        window.electronAPI && window.electronAPI.platform
          ? window.electronAPI.platform
          : (navigator.platform || '').toLowerCase();
      if (plat === 'win32' && this.closeToTrayToggle) {
        this.closeToTrayToggle.addEventListener('change', async (e) => {
          try {
            const enabled = !!e.currentTarget.checked;
            if (window.electronAPI && typeof window.electronAPI.setCloseToTray === 'function') {
              const res = await window.electronAPI.setCloseToTray(enabled);
              this.setSetting('closeToTray', enabled);
              if (!res || res.ok !== true)
                throw new Error(res && res.error ? res.error : 'Bilinmeyen hata');
              this.showNotification(
                enabled
                  ? window.i18n.t('messages.minimizeToTrayEnabled')
                  : window.i18n.t('messages.minimizeToTrayDisabled'),
                'success'
              );
            }
          } catch (err) {
            console.warn('setCloseToTray failed:', err);
            if (this.closeToTrayToggle)
              this.closeToTrayToggle.checked = !this.closeToTrayToggle.checked;
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
    if (this.toggleMarkdownBtn)
      this.toggleMarkdownBtn.addEventListener('click', () => this.toggleMarkdownMode());
    if (this.toggleHtmlBtn)
      this.toggleHtmlBtn.addEventListener('click', () => this.toggleHtmlMode());
    if (this.insertCodeBlockBtn)
      this.insertCodeBlockBtn.addEventListener('click', () => this.insertCodeBlock());
    if (this.markdownEditor)
      this.markdownEditor.addEventListener('input', () => {
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
        const types =
          e.dataTransfer && e.dataTransfer.types ? Array.from(e.dataTransfer.types) : [];
        let isFolderDrag = false;
        try {
          isFolderDrag =
            types.includes('text/folder-id') ||
            Boolean(e.dataTransfer.getData && e.dataTransfer.getData('text/folder-id'));
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
        this.moveNoteToFolder(noteId, null);
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
    document.querySelectorAll('.nav-item[data-filter]').forEach((item) => {
      item.addEventListener('click', (e) => {
        const clickedFilter = e.currentTarget.dataset.filter;

        // Toggle functionality: if clicking the same filter, deactivate it
        if (this.currentFilter === clickedFilter) {
          // Remove active from filter-group items only (keep reminders/notifications state)
          document
            .querySelectorAll('.nav-item[data-filter]')
            .forEach((nav) => nav.classList.remove('active'));
          // Reset to "all" filter
          this.changeFilter('all');
          // Make "all" filter active
          document.querySelector('[data-filter="all"]').classList.add('active');
        } else {
          // Remove active from other filter-group items only
          document
            .querySelectorAll('.nav-item[data-filter]')
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
        const codeAncestor =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer.closest && range.startContainer.closest('code')
            : range.startContainer.parentElement &&
              range.startContainer.parentElement.closest('code');
        // also detect a containing <pre> in case selection sits directly inside <pre>
        const preAncestor =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? range.startContainer.closest && range.startContainer.closest('pre')
            : range.startContainer.parentElement &&
              range.startContainer.parentElement.closest('pre');
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
              while (
                findNode &&
                findNode !== this.richEditor &&
                findNode.tagName &&
                findNode.tagName.toLowerCase() !== 'pre'
              ) {
                findNode = findNode.parentElement;
              }
              const resolvedPre =
                findNode && findNode.tagName && findNode.tagName.toLowerCase() === 'pre'
                  ? findNode
                  : null;
              const para = document.createElement('p');
              para.innerHTML = '<br>';
              if (resolvedPre && resolvedPre.parentNode) {
                if (resolvedPre.nextSibling)
                  resolvedPre.parentNode.insertBefore(para, resolvedPre.nextSibling);
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
          // otherwise we're inside a <code> node: insert a newline at the caret.
          // Only Ctrl/Cmd+Enter above exits the code block; plain Enter should reliably add a newline.
          e.preventDefault();
          try {
            // Ensure we operate on a text node if possible
            if (node.nodeType !== Node.TEXT_NODE) {
              // prefer a text child at the offset
              if (
                node.childNodes &&
                node.childNodes[offset] &&
                node.childNodes[offset].nodeType === Node.TEXT_NODE
              ) {
                node = node.childNodes[offset];
                offset = 0;
              } else {
                // try previous sibling text node
                let prev =
                  node.childNodes && node.childNodes[offset - 1]
                    ? node.childNodes[offset - 1]
                    : null;
                while (prev && prev.nodeType !== Node.TEXT_NODE)
                  prev = prev && prev.previousSibling ? prev.previousSibling : null;
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
                if (!textNode.nodeValue || !textNode.nodeValue.startsWith('\n'))
                  textNode.nodeValue = '\n' + ZW;
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
                    const resolvedPre =
                      preAncestor ||
                      (codeAncestor &&
                        (codeAncestor.closest
                          ? codeAncestor.closest('pre')
                          : codeAncestor.parentElement));
                    if (resolvedPre && resolvedPre.parentNode) {
                      if (resolvedPre.nextSibling)
                        resolvedPre.parentNode.insertBefore(para, resolvedPre.nextSibling);
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
                sel.removeAllRanges();
                sel.addRange(range);
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
      if (
        window.electronAPI &&
        typeof window.electronAPI.onNativeNotificationClick === 'function'
      ) {
        window.electronAPI.onNativeNotificationClick((notificationId) => {
          try {
            if (notificationId) {
              this.markNotificationAsRead(String(notificationId));
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

  setupResizeOptimization() {
    let resizeTimer;

    const startResize = () => {
      if (!this.isResizing) {
        // Set flag immediately (synchronously) to prevent renders
        this.isResizing = true;
        document.body.classList.add('resizing');

        // Disable smooth scrolling during resize
        document.documentElement.style.scrollBehavior = 'auto';
      }
    };

    const endResize = () => {
      this.isResizing = false;
      document.body.classList.remove('resizing');

      // Re-enable smooth scrolling after resize
      document.documentElement.style.scrollBehavior = '';

      // Catch up on list updates that were skipped while resizing (e.g. a reminder fired)
      if (this.renderPendingAfterResize) {
        this.renderPendingAfterResize = false;
        this.updateNotesList();
        this.updateFoldersList();
      }
    };

    // Use passive event listener for better performance
    window.addEventListener(
      'resize',
      () => {
        startResize();
        clearTimeout(resizeTimer);
        // Increased timeout to 100ms to ensure resize is complete
        resizeTimer = setTimeout(endResize, 100);
      },
      { passive: true }
    );
  }

  // Every record id is a string; new ones are random UUIDs
  newId() {
    return crypto.randomUUID();
  }

  // Normalize stored references: ids become strings, and every "no folder/no note" value becomes null
  toId(value) {
    return value === null || value === undefined || value === '' || value === 'default'
      ? null
      : String(value);
  }

  // Date/number locale matching the UI language
  getLocale() {
    return window.i18n && window.i18n.currentLanguage === 'en' ? 'en-US' : 'tr-TR';
  }

  isEditorOpen() {
    return !!this.noteEditor && !this.noteEditor.classList.contains('hidden');
  }

  isViewerOpen() {
    return !!this.noteViewer && !this.noteViewer.classList.contains('hidden');
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

  // Re-render everything that builds translated text in JS (static markup is handled by i18n.js)
  updateDynamicTranslations() {
    this.updateNotesList();
    this.updateFoldersList();
    this.updateRemindersView();
    this.updateNotificationsView();
    this.renderTodosSections();
    this.updateTagsDisplay();

    if (this.currentNote) {
      if (this.isViewerOpen()) this.displayNote(this.currentNote);
      if (this.isEditorOpen()) {
        this.updateWordCount();
        this.updateCurrentDate();
        this.updateNoteRemindersDisplay();
      }
      if (this.noteHistoryModal && !this.noteHistoryModal.classList.contains('hidden')) {
        this.openNoteHistory();
      }
    }
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
    this.setSetting('editorSidebarVisible', this.isSidebarVisible);
  }

  loadSidebarPreference() {
    this.isSidebarVisible = this.settings.editorSidebarVisible;
    this.editorSidebar.classList.toggle('hidden', !this.isSidebarVisible);
    this.toggleSidebarBtn.classList.toggle('active', this.isSidebarVisible);
  }
}

applyFeatures(CapnoteApp, [
  HtmlFeature,
  StorageFeature,
  SettingsFeature,
  LockFeature,
  NotesFeature,
  ScreensFeature,
  ViewerFeature,
  EditorFeature,
  EditorFormattingFeature,
  EditorInsertFeature,
  PreviewsFeature,
  EmojiFeature,
  NoteListFeature,
  FoldersFeature,
  RemindersFeature,
  NotificationsFeature,
  TodosFeature,
  UiFeature,
  ExportFeature,
  BackupFeature,
  AttachmentsFeature,
]);
