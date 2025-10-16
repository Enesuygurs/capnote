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

  // Markdown controls
  this.toggleMarkdownBtn = document.getElementById('toggleMarkdownBtn');
  this.markdownEditor = document.getElementById('markdownEditor');
  this.markdownPreview = document.getElementById('markdownPreview');
  this.toggleHtmlBtn = document.getElementById('toggleHtmlBtn');
  this.htmlPreview = document.getElementById('htmlPreview');
  this.insertCodeBlockBtn = document.getElementById('insertCodeBlockBtn');

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
  this.maxPinnedSelect = document.getElementById('maxPinnedSelect');
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
        if (codeAncestor) {
          // we're inside a <code> node; insert a newline character into the text node at caret
          e.preventDefault();
          // if there's a text node at the caret, insert into it; otherwise create one
          let node = range.startContainer;
          let offset = range.startOffset;
          if (node.nodeType !== Node.TEXT_NODE) {
            // try to find/create a text node
            if (node.childNodes[offset] && node.childNodes[offset].nodeType === Node.TEXT_NODE) {
              node = node.childNodes[offset];
              offset = 0;
            } else {
              const textNode = document.createTextNode('\n');
              range.insertNode(textNode);
              // move caret after inserted newline
              range.setStartAfter(textNode);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
              this.trackContentChanges();
              return;
            }
          }
          const text = node.nodeValue || '';
          const before = text.substring(0, offset);
          const after = text.substring(offset);
          node.nodeValue = before + '\n' + after;
          // set caret after the newline
          const newRange = document.createRange();
          newRange.setStart(node, before.length + 1);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          this.trackContentChanges();
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

  insertCodeBlock() {
    // Insert a fenced code block at the current caret/selection in the appropriate editor.
    const fenceTemplate = "```language\n// your code here\n```\n";

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
      const caretPos = before.length + (firstNewline >= 0 ? firstNewline + 1 : 0);
      // place caret at start of code region (after the opening fence line)
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
      if (!sel || !sel.rangeCount) {
        // append at the end
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = '// your code here';
        pre.appendChild(code);
        this.richEditor.appendChild(pre);
        return;
      }
      const range = sel.getRangeAt(0);
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = '// your code here';
      pre.appendChild(code);
      range.deleteContents();
      // insert the pre node
      range.insertNode(pre);
      // place caret inside the code node at the end of the placeholder text
      sel.removeAllRanges();
      const newRange = document.createRange();
      if (code.firstChild && code.firstChild.nodeType === Node.TEXT_NODE) {
        newRange.setStart(code.firstChild, code.firstChild.length);
      } else {
        newRange.setStart(code, 0);
      }
      newRange.collapse(true);
      sel.addRange(newRange);
    } catch (e) {
      // fallback: append
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = '// your code here';
      pre.appendChild(code);
      this.richEditor.appendChild(pre);
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
    // Settings export/import
    this.exportSettingsBtn = document.getElementById('exportSettingsBtn');
    this.importSettingsBtn = document.getElementById('importSettingsBtn');
    if (this.exportSettingsBtn) this.exportSettingsBtn.addEventListener('click', () => this.exportSettings());
    if (this.importSettingsBtn) this.importSettingsBtn.addEventListener('click', () => this.importSettings());

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

    // Editor-side reading time estimate (baseline 200 WPM)
    const WPM = 200;
    const seconds = words ? Math.ceil((words / WPM) * 60) : 0;
    if (this.editorReadingTime) {
      if (!seconds) this.editorReadingTime.textContent = `0 dk okuma`;
      else if (seconds < 60) this.editorReadingTime.textContent = `~${seconds} sn okuma`;
      else this.editorReadingTime.textContent = `~${Math.round(seconds / 60)} dk okuma`;
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
    } catch (e) {
      this.markdownPreview.textContent = md;
    }
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
      if (note.isMarkdown) {
        try {
          this.viewerText.innerHTML = (window.marked && marked.parse) ? marked.parse(note.content || '') : (note.content || '');
        } catch (e) {
          this.viewerText.textContent = note.content || '';
        }
      } else {
        this.viewerText.innerHTML = note.content;
      }
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
  if (this.viewerWordCount) this.viewerWordCount.textContent = `${counts.words} kelime`;
  if (this.viewerCharCount) this.viewerCharCount.textContent = `${counts.chars} karakter`;
  // Reading time calculation (baseline 200 words per minute)
  const WPM = 200;
  if (!counts.words) {
    this.readingTime.textContent = `0 dk okuma`;
  } else {
    const seconds = Math.ceil((counts.words / WPM) * 60);
    if (seconds < 60) {
      this.readingTime.textContent = `~${seconds} sn okuma`;
    } else {
      const minutes = Math.round(seconds / 60);
      this.readingTime.textContent = `~${minutes} dk okuma`;
    }
  }
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
  moodWeatherKeywords() {
    return {
      // moods
      '😊': ['mutlu', 'happy'],
      '😢': ['üzgün', 'uzgun', 'sad'],
      '😡': ['kızgın', 'kizgin', 'angry'],
      '😴': ['yorgun', 'tired'],
      '😍': ['aşık', 'asik', 'love'],
      '🤔': ['düşünceli', 'dusunceli', 'thinking'],
      '😎': ['havalı', 'havali', 'cool'],
      '🙄': ['sıkılmış', 'sikilmış', 'sikilmis', 'bored'],
      // weather
      '☀️': ['güneş', 'gunes', 'güneşli', 'gunesli', 'sunny'],
      '⛅': ['parçalı', 'parçalı bulutlu', 'parcali', 'partly cloudy'],
      '☁️': ['bulutlu', 'cloudy'],
      '🌧️': ['yağmurlu', 'yagmurlu', 'rainy'],
      '⛈️': ['fırtına', 'fırtınalı', 'furtina', 'stormy'],
      '❄️': ['karlı', 'karli', 'snowy'],
    };
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

    // check mapped keywords for mood/weather
    const map = this.moodWeatherKeywords();
    for (const [emoji, keywords] of Object.entries(map)) {
      if (keywords.some((k) => k.includes(searchTerm))) {
        if (note.mood === emoji || note.weather === emoji) return true;
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

    // If pasted text has multiple lines, insert as a single <pre><code> block
    if (text.includes('\n')) {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      // Preserve text exactly, including newlines
      code.textContent = text;
      pre.appendChild(code);
      // insert at range
      range.deleteContents();
      range.insertNode(pre);
      // place caret after the inserted block
      sel.removeAllRanges();
      const afterRange = document.createRange();
      afterRange.setStartAfter(pre);
      afterRange.collapse(true);
      sel.addRange(afterRange);
      this.trackContentChanges();
      return;
    }

    // Default single-line paste
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
  // Locking note (debug logs removed)
      note.isLocked = true;
      note.password = password.trim();

      // Clean up temporary unlock flag if exists
      delete note.isUnlocked;

      this.saveNotes();
      this.updateNotesList();
      this.showNotification('Not kilitlendi', 'success');
  // Note lock result (debug logs removed)
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
  // Ensure we apply or restore folder colors based on the stored preference.
  // Calling with false will attempt to restore from the stored backup if available.
  this.applyFolderAccentSync(syncFolders);

    // Load max pinned notes preference (default 3)
    const maxPinned = parseInt(localStorage.getItem('maxPinnedNotes'), 10) || 3;
    if (this.maxPinnedSelect) this.maxPinnedSelect.value = String(maxPinned);
    if (this.maxPinnedSelect) {
      this.maxPinnedSelect.addEventListener('change', (e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v >= 3 && v <= 10) {
          localStorage.setItem('maxPinnedNotes', String(v));
          this.showNotification('Sabit not limiti güncellendi', 'success');
        }
      });
    }
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
  document.documentElement.style.setProperty('--accent-color-rgba-10', `rgba(${r}, ${g}, ${b}, 0.10)`);
  document.documentElement.style.setProperty('--accent-color-rgba-12', `rgba(${r}, ${g}, ${b}, 0.12)`);

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
      const rect = folderHeader.getBoundingClientRect();
      const isBefore = (e.clientY - rect.top) < (rect.height / 2);

      const siblings = Array.from(folderHeader.parentElement.querySelectorAll('.folder-item, .default-folder'));

      if (isFolderDrag) {
        // For folder drag, show only the thin insertion line (insert-before/after). Don't show the dashed border.
        folderHeader.classList.remove('drag-over');
        folderHeader.classList.toggle('insert-before', isBefore);
        folderHeader.classList.toggle('insert-after', !isBefore);
        siblings.forEach((s) => {
          if (s !== folderHeader) {
            s.classList.remove('insert-before', 'insert-after', 'drag-over');
          }
        });
      } else {
        // For other drags (notes), preserve the previous behavior: show dashed border and no insertion line
        folderHeader.classList.add('drag-over');
        folderHeader.classList.remove('insert-before', 'insert-after');
        siblings.forEach((s) => {
          if (s !== folderHeader) {
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
        if (sourceId !== targetId) {
          // Determine whether to insert before or after based on mouse position
          const rect = folderHeader.getBoundingClientRect();
          const insertBefore = (e.clientY - rect.top) < (rect.height / 2);
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
        this.showNotification(`En fazla ${maxPinned} not sabitlenebilir`, 'error');
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
