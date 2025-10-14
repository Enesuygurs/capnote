class CapnoteApp {
  constructor() {
    this.currentNote = null;
    this.notes = [];
    this.folders = [];
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

  async init() {
    await this.loadNotes();
    this.initializeElements();
    this.setupEventListeners();
    this.loadSettings();
    this.loadSidebarPreference();
    this.initializeHamburgerIcon();
    this.updateUI();
    this.updateStats();

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
    this.darkModeToggle = document.getElementById('darkModeToggle');
  this.accentYellowBtn = document.getElementById('accentYellow');
  this.accentCherryBtn = document.getElementById('accentCherry');
  this.accentAppleBtn = document.getElementById('accentApple');
  this.accentPurpleBtn = document.getElementById('accentPurple');
  this.accentBlueBtn = document.getElementById('accentBlue');
  this.syncFolderAccentToggle = document.getElementById('syncFolderAccentToggle');

    // Folder elements
    this.addFolderBtn = document.getElementById('addFolderBtn');
    this.folderModal = document.getElementById('folderModal');
    this.folderNameInput = document.getElementById('folderNameInput');
    this.createFolderBtn = document.getElementById('createFolderBtn');
    this.cancelFolderBtn = document.getElementById('cancelFolderBtn');
    this.foldersList = document.getElementById('foldersList');
    this.importNotesBtn = document.getElementById('importNotesBtn');
    this.exportAllNotesBtn = document.getElementById('exportAllNotesBtn');
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
        const noteId = e.dataTransfer.getData('text/plain');
        console.log('Dropped note ID:', noteId, 'to main notes list');
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
            // Remove active from all nav items
            document
              .querySelectorAll('.nav-item, .nav-subitem')
              .forEach((nav) => nav.classList.remove('active'));
            // Reset to "all" filter
            this.changeFilter('all');
            // Make "all" filter active
            document.querySelector('[data-filter="all"]').classList.add('active');
          } else {
            // Remove active from all nav items and subitems
            document
              .querySelectorAll('.nav-item, .nav-subitem')
              .forEach((nav) => nav.classList.remove('active'));
            // Add active to clicked item
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
          console.log('Lock button clicked for note:', noteId);
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

    // Checkbox listeners
    this.setupCheckboxListeners();
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

    this.importNotesBtn.addEventListener('click', () => {
      this.importNotes();
    });

    this.exportAllNotesBtn.addEventListener('click', () => {
      this.exportAllNotes();
    });

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

  showPasswordModal(title, message = '') {
    this.passwordModalTitle.textContent = title;
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
      this.showNotification('Lütfen bir şifre girin', 'warning');
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
    } catch (error) {
      console.error('Klasörler yüklenirken hata:', error);
      this.folders = [];
    }
  }

  async saveNotes() {
    try {
  localStorage.setItem('capnote-notes', JSON.stringify(this.notes));
    } catch (error) {
      console.error('Notlar kaydedilirken hata:', error);
      this.showNotification('Notlar kaydedilemedi!', 'error');
    }
  }

  async saveFolders() {
    try {
  localStorage.setItem('capnote-folders', JSON.stringify(this.folders));
    } catch (error) {
      console.error('Klasörler kaydedilirken hata:', error);
      this.showNotification('Klasörler kaydedilemedi!', 'error');
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

    // Reset form
    this.resetFormState();
  }

  showViewer() {
    this.welcomeScreen.classList.add('hidden');
    this.noteEditor.classList.add('hidden');
    this.noteViewer.classList.remove('hidden');
    this.clearSavedSelection();
  }

  showWelcome() {
    this.noteEditor.classList.add('hidden');
    this.noteViewer.classList.add('hidden');
    this.welcomeScreen.classList.remove('hidden');
    this.clearSavedSelection();
  }

  clearEditor() {
    this.noteTitle.value = '';
    this.richEditor.innerHTML = '';
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
      this.noteDate.textContent = now.toLocaleDateString('tr-TR', {
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
      this.wordCount.textContent = `${words} kelime`;
    }
    if (this.charCount) {
      this.charCount.textContent = `${chars} karakter`;
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
    const content = this.richEditor.innerHTML;

    this.currentNote.title = title;
    this.currentNote.content = content;
    const nowIso = new Date().toISOString();
    this.currentNote.updatedAt = nowIso;
    // Maintain history of updates (timestamp strings)
    if (!this.currentNote.history) this.currentNote.history = [];
    // If this is a new note (no createdAt), set createdAt and initialize history
    if (!this.currentNote.createdAt) {
      this.currentNote.createdAt = nowIso;
      this.currentNote.history.push({ type: 'created', ts: nowIso });
    } else {
      // record update
      this.currentNote.history.push({ type: 'updated', ts: nowIso });
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
      this.showNotification('Not kaydedildi!', 'success');
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
    this.richEditor.innerHTML = note.content;
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

    // Reset save button state - note is loaded as-is, no changes yet
    this.lastSavedContent = this.getCurrentNoteContent();
    this.isAutoSaved = true;
    this.updateSaveButtonState();

    // Update favorite button state
    this.updateFavoriteButtons();
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
      `"${this.currentNote.title}" notunu silmek istediğinizden emin misiniz?`,
      () => {
        this.notes = this.notes.filter((note) => note.id !== this.currentNote.id);
        this.saveNotes();
        this.updateNotesList();
        this.updateStats();
        this.showNotification('Not silindi!', 'success');

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
    this.showNotification('Not kopyalandı!', 'success');

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
                    <h3>Bu not kilitli</h3>
                    <p>İçeriği görüntülemek için not listesinden kilidi açın.</p>
                </div>
            `;
    } else {
      this.viewerText.innerHTML = note.content;
    }

    this.applyViewerFormatting(note.formatting);

    // Restore checkbox states in viewer
    this.restoreCheckboxStatesInViewer();

    // Save last viewed note
    this.saveLastViewedNote(note.id);

    // Tarih bilgisi
    const createdDate = new Date(note.createdAt);
    const updatedDate = new Date(note.updatedAt);
    this.viewerDate.textContent = createdDate.toLocaleDateString('tr-TR', {
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
  this.viewerWordCount.textContent = `${counts.words} kelime`;
  this.readingTime.textContent = `~${Math.max(1, Math.ceil(counts.words / 200))} dk okuma`;
    // Show date + time for last modified (e.g. 12.10.2025 14:35)
    this.lastModified.textContent = updatedDate.toLocaleString('tr-TR', {
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
    if (created) {
      const el = document.createElement('div');
      el.className = 'history-entry created';
      el.innerHTML = `<strong>Oluşturuldu:</strong> ${created.toLocaleString('tr-TR')}`;
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
        item.innerHTML = `<span class="history-type">Güncellendi</span> <span class="history-ts">${d.toLocaleString('tr-TR')}</span>`;
        list.appendChild(item);
      });
      this.historyBody.appendChild(list);
    } else {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = 'Bu not için geçmiş kaydı yok.';
      this.historyBody.appendChild(empty);
    }

    this.showModal(this.noteHistoryModal);
  }

  updateNotesList() {
    this.notesList.innerHTML = '';

    const filteredNotes = this.getFilteredNotes();
    const sortedNotes = this.getSortedNotes(filteredNotes);

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
      const searchTerm = this.searchInput.value.toLowerCase().trim();
      if (searchTerm) {
        folderNotes = folderNotes.filter(
          (note) =>
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm) ||
            (note.tags || []).some((tag) => tag.toLowerCase().includes(searchTerm))
        );
      }

      const sortedFolderNotes = this.getSortedNotes(folderNotes);
      sortedFolderNotes.forEach((note) => {
        const noteElement = this.createFolderNoteElement(note);
        container.appendChild(noteElement);
      });
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

    // Search filter
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    if (searchTerm) {
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(searchTerm) ||
          note.content.toLowerCase().includes(searchTerm) ||
          (note.tags || []).some((tag) => tag.toLowerCase().includes(searchTerm))
      );
    }

    return filtered;
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
                        title="${note.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="note-action-btn pin-btn ${note.isPinned ? 'pinned' : ''}" 
                        data-note-id="${note.id}"
                        title="${note.isPinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}">
                    <i class="fas fa-thumbtack"></i>
                </button>
                <button class="note-action-btn lock-btn ${note.isLocked ? 'locked' : ''}" 
                        data-note-id="${note.id}"
                        title="${note.isLocked ? 'Kilidi aç' : 'Kilitle'}">
                    <i class="fas fa-lock"></i>
                </button>
                <button class="note-action-btn delete-btn" 
                        data-note-id="${note.id}"
                        title="Notu sil">
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
    document.execCommand('justify' + align.charAt(0).toUpperCase() + align.slice(1));
    this.captureEditorSelection();
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
        const computedBg = window.getComputedStyle(node).backgroundColor;

        const textHex = this.rgbToHex(computedColor);
        const bgHex = this.rgbToHex(computedBg);

        if (this.textColor && textHex) this.textColor.value = textHex;
        if (this.bgColor && bgHex && bgHex !== 'rgba(0, 0, 0, 0)') this.bgColor.value = bgHex;
      } catch (e) {
        // ignore if any issue reading computed styles
      }

      // ...existing code...
    } catch (e) {
      console.warn('Error updating format panel:', e);
    }
  }

  rgbToHex(rgb) {
    if (!rgb || rgb === 'rgba(0, 0, 0, 0)') return '#000000';

    const rgbMatch = rgb.match(/\d+/g);
    if (!rgbMatch || rgbMatch.length < 3) return '#000000';

    const r = parseInt(rgbMatch[0]);
    const g = parseInt(rgbMatch[1]);
    const b = parseInt(rgbMatch[2]);

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
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
    document.execCommand('insertText', false, text);
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
    this.showNotification('Ruh hali seçimi için yan paneli kullanın', 'info');
  }

  showWeatherPicker() {
    // Implementation for weather picker modal
    this.showNotification('Hava durumu seçimi için yan paneli kullanın', 'info');
  }

  // Tags methods
  addTag(tagText) {
    if (!tagText || this.tags.includes(tagText)) return;

    // Maksimum 5 etiket kontrolü
    if (this.tags.length >= 5) {
      this.showNotification('Maksimum 5 etiket ekleyebilirsiniz!', 'warning');
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
    this.showNotification('Not dışa aktarıldı!', 'success');
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
            <p>Oluşturulma: ${new Date(note.createdAt).toLocaleString('tr-TR')}</p>
            <p>Güncelleme: ${new Date(note.updatedAt).toLocaleString('tr-TR')}</p>
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

  exportToPDF() {
    // PDF export would require a library like jsPDF
    this.showNotification('PDF dışa aktarma özelliği henüz hazır değil', 'warning');
  }

  // Modal methods
  showModal(modal) {
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('show'), 10);
  }

  hideModal(modal) {
    // Remove the visible class and hide immediately to avoid perceived lag.
    // Previously we waited for the CSS transition before hiding which caused
    // a delay when users expected the popup to close right away.
    modal.classList.remove('show');
    modal.classList.add('hidden');
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

  // Notification methods
  showNotification(message, type = 'info') {
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
    const password = await this.showPasswordModal('Not için şifre belirleyin');
    if (password && password.trim()) {
      console.log('Locking note:', note.title, 'with password:', password);
      note.isLocked = true;
      note.password = password.trim();

      // Clean up temporary unlock flag if exists
      delete note.isUnlocked;

      this.saveNotes();
      this.updateNotesList();
      this.showNotification('Not kilitlendi', 'success');
      console.log('Note locked successfully:', note.isLocked);
    }
  }

  async unlockNote(note) {
    const password = await this.showPasswordModal('Not kilidini açmak için şifre girin');
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
      this.showNotification('Not kilidi açıldı', 'success');
    } else if (password !== null) {
      // null means cancelled
      this.showNotification('Yanlış şifre!', 'error');
    }
  }

  async unlockNoteForViewing(note) {
    const password = await this.showPasswordModal('Bu not kilitli');
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

      this.showNotification('Not geçici olarak açıldı', 'info');
    } else if (password !== null) {
      // null means cancelled
      this.showNotification('Yanlış şifre!', 'error');
    }
  }

  deleteNoteById(noteId) {
    const note = this.notes.find((n) => n.id == noteId);
    if (!note) return;

    this.confirmMessage.textContent = `"${note.title}" notunu silmek istediğinizden emin misiniz?`;
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

        this.showNotification('Not silindi!', 'success');
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
      note.isFavorite ? 'Favorilere eklendi!' : 'Favorilerden çıkarıldı!',
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
    if (syncFolders) this.applyFolderAccentSync(true);
  }

  saveSettings() {
    // Save dark mode preference
    localStorage.setItem('darkMode', this.darkModeToggle.checked);
    // Save sync-folder-accent preference
    if (this.syncFolderAccentToggle) localStorage.setItem('syncFolderAccent', this.syncFolderAccentToggle.checked ? '1' : '0');
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

    if (options.persist !== false) localStorage.setItem('accentColor', color);
    // If sync option enabled, apply accent color to all folder icons
    const syncFolders = localStorage.getItem('syncFolderAccent') === '1';
    if (syncFolders) this.applyFolderAccentSync(true);
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

        if (!Array.isArray(importedData.notes)) {
          throw new Error('Geçersiz dosya formatı');
        }

        // Ask user if they want to merge or replace
        const merge = await this.showConfirmDialog(
          'İçe Aktarma Seçeneği',
          `${importedData.notes.length} not bulundu. Mevcut notlarınızla birleştirmek istiyor musunuz? (Hayır seçerseniz mevcut notlar silinir)`
        );

        if (!merge) {
          this.notes = [];
        }

        // Add imported notes
        let addedCount = 0;
        importedData.notes.forEach((note) => {
          // Generate new ID to avoid conflicts
          const newNote = {
            ...note,
            id: Date.now() + Math.random(),
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          this.notes.push(newNote);
          addedCount++;
        });

        await this.saveNotes();
        this.updateNotesList();
        this.updateStats();

        this.showNotification(`${addedCount} not başarıyla içe aktarıldı!`, 'success');
        // Settings modal için anında kapatma
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
      notes: this.notes,
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
    return new Promise((resolve) => {
      this.confirmModal.querySelector('h3').textContent = title;

      const handleConfirm = () => {
        this.confirmBtn.removeEventListener('click', handleConfirm);
        this.cancelBtn.removeEventListener('click', handleCancel);
        this.hideModal(this.confirmModal);
        resolve(true);
      };

      const handleCancel = () => {
        this.confirmBtn.removeEventListener('click', handleConfirm);
        this.cancelBtn.removeEventListener('click', handleCancel);
        this.hideModal(this.confirmModal);
        resolve(false);
      };

      this.confirmBtn.addEventListener('click', handleConfirm);
      this.cancelBtn.addEventListener('click', handleCancel);

      this.showModal(this.confirmModal);
    });
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
    if (titleEl) titleEl.textContent = 'Yeni Klasör';
    if (iconEl) { iconEl.className = 'fas fa-folder-plus'; }
    if (createBtn) createBtn.textContent = 'Oluştur';
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

    this.folders.forEach((folder) => {
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
    folderHeader.addEventListener('click', (e) => {
      e.preventDefault();
      folderHeader.classList.toggle('expanded');
      const chevron = folderHeader.querySelector('.nav-expand');
      if (folderHeader.classList.contains('expanded')) {
        notesContainer.style.display = 'block';
        chevron.style.transform = 'rotate(0deg)';
      } else {
        notesContainer.style.display = 'none';
        chevron.style.transform = 'rotate(-90deg)';
      }
    });

    // Add right-click context menu
    folderHeader.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showFolderContextMenu(e.clientX, e.clientY, folder.id);
    });

    container.appendChild(folderHeader);
    container.appendChild(notesContainer);

    // Add drop event listeners to folder header
    folderHeader.addEventListener('dragover', (e) => {
      e.preventDefault();
      folderHeader.classList.add('drag-over');
    });

    folderHeader.addEventListener('dragleave', () => {
      folderHeader.classList.remove('drag-over');
    });

    folderHeader.addEventListener('drop', (e) => {
      e.preventDefault();
      folderHeader.classList.remove('drag-over');
      const noteId = e.dataTransfer.getData('text/plain');
      console.log('Dropped note ID:', noteId, 'on folder:', folder.id);
      this.moveNoteToFolder(parseInt(noteId), folder.id);
    });

    return container;
  }

  createFolderNoteElement(note) {
    const div = document.createElement('div');
    // Keep folder-note-item but also include note-item so styles and actions match main list
    div.className = 'nav-subitem folder-note-item note-item fade-in';
    div.draggable = true;
    div.setAttribute('data-note-id', note.id);

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
                        title="${note.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="note-action-btn pin-btn ${note.isPinned ? 'pinned' : ''}" 
                        data-note-id="${note.id}"
                        title="${note.isPinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}">
                    <i class="fas fa-thumbtack"></i>
                </button>
                <button class="note-action-btn lock-btn ${note.isLocked ? 'locked' : ''}" 
                        data-note-id="${note.id}"
                        title="${note.isLocked ? 'Kilidi aç' : 'Kilitle'}">
                    <i class="fas fa-lock"></i>
                </button>
                <button class="note-action-btn delete-btn" 
                        data-note-id="${note.id}"
                        title="Notu sil">
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
    if (!note) {
      return;
    }

    const oldFolderId = note.folderId || 'default';
    note.folderId = folderId;
    note.updatedAt = new Date().toISOString();

    await this.saveNotes();

    // Update only the affected folders
    if (oldFolderId === 'default' || !oldFolderId) {
      this.updateNotesList();
    } else {
      this.updateSpecificFolder(oldFolderId);
    }

    if (folderId !== 'default') {
      // Note was moved to a folder, update that folder
      this.updateSpecificFolder(folderId);
    } else {
      // Note was moved to main list, update main list
      this.updateNotesList();
    }

    // Show notification
    const folderName =
      folderId === 'default'
        ? 'Notlar'
        : this.folders.find((f) => f.id === folderId)?.name || 'Bilinmeyen Klasör';
    this.showNotification(
      `"${note.title || 'Başlıksız not'}" ${folderName} klasörüne taşındı`,
      'success'
    );
  // Keep the current filter selected after moving notes
  if (this.currentFilter === 'favorites') this.updateNotesList();
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

    const message = note.isFavorite ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı';
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

    // Apply search filter to folder notes
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    if (searchTerm) {
      folderNotes = folderNotes.filter(
        (note) =>
          note.title.toLowerCase().includes(searchTerm) ||
          note.content.toLowerCase().includes(searchTerm) ||
          (note.tags || []).some((tag) => tag.toLowerCase().includes(searchTerm))
      );
    }

    const sortedFolderNotes = this.getSortedNotes(folderNotes);
    sortedFolderNotes.forEach((note) => {
      const noteElement = this.createFolderNoteElement(note);
      folderContainer.appendChild(noteElement);
    });
  }

  async togglePin(noteId) {
    const note = this.notes.find((n) => n.id == noteId);
    if (!note) return;

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

    const message = note.isPinned ? 'Not sabitlendi' : 'Sabitleme kaldırıldı';
    this.showNotification(message, 'success');
  }

  async toggleLock(noteId) {
    const note = this.notes.find((n) => n.id == noteId);
    if (!note) return;

    if (note.isLocked) {
      // Unlock note - ask for password
      const password = await this.showPasswordModal('Notu açmak için şifre girin');
      if (!password) return;

      // For now, any password unlocks (you can add proper password validation)
      note.isLocked = false;
      this.showNotification('Not kilidi açıldı', 'success');
    } else {
      // Lock note - ask for password
      const password = await this.showPasswordModal('Not için şifre belirleyin');
      if (!password) return;

      note.isLocked = true;
      note.password = password; // In real app, this should be hashed
      this.showNotification('Not kilitlendi', 'success');
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

    // Count notes in folder
    const notesInFolder = this.notes.filter((note) => note.folderId === this.selectedFolderId);
    const noteCount = notesInFolder.length;

    const message =
      noteCount > 0
        ? `"${folder.name}" klasörü ve içindeki ${noteCount} not kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`
        : `"${folder.name}" klasörü silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`;

    this.confirmMessage.textContent = message;

    // Store folderId locally before hiding context menu
    const folderIdToDelete = this.selectedFolderId;

    this.confirmCallback = () => {
      // Delete all notes in the folder
      // Keep notes that are NOT in the selected folder
      this.notes = this.notes.filter((note) => note.folderId != folderIdToDelete);

      // Delete the folder
      this.folders = this.folders.filter((f) => f.id != folderIdToDelete);

      // Save and update
      this.saveNotes();
      this.saveFolders();
    this.updateFoldersList();
    this.updateStats();
    if (this.currentFilter === 'favorites') this.updateNotesList();

      // Clear selection if current note was in deleted folder
      if (this.currentNote && this.currentNote.folderId == folderIdToDelete) {
        this.currentNote = null;
        this.showWelcome();
      }

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
    this.showNotification('Klasör rengi güncellendi', 'success');
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
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CapnoteApp();
});

// Export for global access
window.CapnoteApp = CapnoteApp;
