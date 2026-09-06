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
import { UpdatesFeature } from './features/updates.js';
import { SelectionFeature } from './features/selection.js';
import { EditorBlocksFeature } from './features/editor-blocks.js';
import { i18n } from './i18n.js';

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
    // Notes and folders picked with Ctrl/Cmd+click
    this.selectedNoteIds = new Set();
    this.selectedFolderIds = new Set();
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
    if (i18n && i18n.ready) {
      await i18n.ready;
    }

    await this.initStorage();
    i18n.setLanguage(this.settings.language);
    await this.loadNotes();
    await this.loadReminders();
    await this.loadNotifications();
    await this.loadTodos();
    this.initializeElements();
    this.setupEventListeners();
    this.setupSettingsEventListeners();
    this.setupResizeOptimization();
    this.loadSettings();
    window.electronAPI?.setLanguage?.(i18n.getLanguage());
    this.loadSidebarPreference();
    this.initializeHamburgerIcon();
    this.updateUI();
    this.updateStats();
    this.updateTodosCount();
    this.startReminderChecker();
    this.cleanupUploads();
    this.setupUpdates();

    // Make sure the current filter (default: 'all') is applied so
    // the corresponding nav item appears active on startup
    this.changeFilter(this.currentFilter);

    // The page chosen in the settings: the last note, home, a new note, to-dos or notifications
    this.openStartupPage();
  }

  initializeElements() {
    // Main screens
    this.welcomeScreen = document.getElementById('welcomeScreen');
    this.noteEditor = document.getElementById('noteEditor');
    this.noteViewer = document.getElementById('noteViewer');
    this.notesList = document.getElementById('notesList');

    // Butonlar
    this.homeBtn = document.getElementById('homeBtn');
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
    this.filterTabs = document.querySelectorAll('.segment[data-filter]');

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
    this.settingsNav = document.getElementById('settingsNav');
    this.toggleNativeNotifications = document.getElementById('toggleNativeNotifications');
    this.testNativeNotifBtn = document.getElementById('testNativeNotifBtn');
    this.clearAllNotesBtn = document.getElementById('clearAllNotesBtn');
    this.clearAllFoldersBtn = document.getElementById('clearAllFoldersBtn');
    this.clearAllContentBtn = document.getElementById('clearAllContentBtn');
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
    this.startupPageSelect = document.getElementById('startupPageSelect');
    this.autoSaveToggle = document.getElementById('autoSaveToggle');

    // Folder elements
    this.addFolderBtn = document.getElementById('addFolderBtn');
    this.folderModal = document.getElementById('folderModal');
    this.folderNameInput = document.getElementById('folderNameInput');
    this.createFolderBtn = document.getElementById('createFolderBtn');
    this.cancelFolderBtn = document.getElementById('cancelFolderBtn');
    this.foldersList = document.getElementById('foldersList');
    this.pinnedFoldersList = document.getElementById('pinnedFoldersList');
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
    this.noteContextMenu = document.getElementById('noteContextMenu');
    this.selectionMenu = document.getElementById('selectionMenu');
    this.sidebarContent = document.querySelector('.sidebar-content');
    this.deleteFolderMenuItem = document.getElementById('deleteFolderMenuItem');
    this.renameFolderMenuItem = document.getElementById('renameFolderMenuItem');
    this.changeFolderColorMenuItem = document.getElementById('changeFolderColorMenuItem');
    this.pinFolderMenuItem = document.getElementById('pinFolderMenuItem');
    this.folderColorModal = document.getElementById('folderColorModal');
    this.folderColorInput = document.getElementById('folderColorInput');
    this.saveFolderColorBtn = document.getElementById('saveFolderColorBtn');
    this.cancelFolderColorBtn = document.getElementById('cancelFolderColorBtn');
    this.closeFolderColorModal = document.getElementById('closeFolderColorModal');

    // Toast
    this.notification = document.getElementById('notification');
    this.notificationText = document.getElementById('notificationText');
    this.notificationIcon = document.getElementById('notificationIcon');

    // Stats
    this.totalNotes = document.getElementById('totalNotes');
    this.daysActive = document.getElementById('daysActive');
    this.totalWords = document.getElementById('totalWords');

    // Mood and weather buttons
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
    this.setupAppShellEvents();
    this.setupSettingsControls();
    this.setupNoteActionEvents();
    this.setupViewerEvents();
    this.setupNoteListEvents();
    this.setupPreviewEvents();
    this.setupFolderEvents();
    this.setupSelectionEvents();
    this.setupEmojiOutsideClose();
    this.setupReminderEvents();
    this.setupEditorEvents();
    this.setupInsertEvents();
    this.setupBlockEvents();
    this.setupCustomDropdown();
    this.setupFormattingToolbar();
    this.setupMoodWeatherSelectors();
    this.setupModalEvents();
    this.setupKeyboardShortcuts();
    this.setupAutoSave();
    this.setupCheckboxListeners();
  }

  // Window controls, main buttons and events sent by the main process
  setupAppShellEvents() {
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

    this.settingsNav.addEventListener('click', () => this.showSettingsModal());

    // Tray context menu entries
    window.electronAPI.onOpenNotifications(() => this.showNotificationsScreen());
    window.electronAPI.onNewNote(() => this.createNewNote());
    window.electronAPI.onOpenSettings(() => this.showSettingsModal());

    this.startFirstNoteBtn.addEventListener('click', () => this.createNewNote());

    // New note navigation item
    document.getElementById('newNoteNav')?.addEventListener('click', () => this.createNewNote());

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

  // Sidebar count badges: hidden at zero unless they should always show
  setCount(el, count, { alwaysShow = false, emphasize = false } = {}) {
    if (!el) return;
    el.textContent = String(count);
    el.classList.toggle('hidden', !alwaysShow && count === 0);
    el.classList.toggle('is-emphasized', emphasize && count > 0);
  }

  // Date/number locale matching the UI language
  getLocale() {
    return i18n && i18n.currentLanguage === 'en' ? 'en-US' : 'tr-TR';
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
    this.renderUpdateState();

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
  UpdatesFeature,
  SelectionFeature,
  EditorBlocksFeature,
]);
