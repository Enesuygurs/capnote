// Sidebar note list: rendering, filtering, sorting and search

import { i18n } from '../i18n.js';
import { MOOD_KEYWORDS, WEATHER_KEYWORDS } from '../data/moods.js';

export class NoteListFeature {
  // Note option menus are moved to <body> when opened; drop them when their lists are rebuilt
  // (an item re-attaches its menu the next time it is opened)
  discardDetachedMenus() {
    document.querySelectorAll('body > .note-options-menu').forEach((menu) => menu.remove());
  }

  updateNotesList() {
    // Skip rendering during window resize for better performance; redone when resizing ends
    if (this.isResizing) {
      this.renderPendingAfterResize = true;
      return;
    }

    this.discardDetachedMenus();
    this.notesList.innerHTML = '';

    const filteredNotes = this.getFilteredNotes();
    const sortedNotes = this.getSortedNotes(filteredNotes);

    // Update nav count for visible notes (include folder-contained notes)
    const navCountEl = document.getElementById('navNotesCount');
    this.setCount(navCountEl, this.getVisibleNotesCount(), { alwaysShow: true });

    sortedNotes.forEach((note) => {
      const noteElement = this.createNoteItem(note);
      this.notesList.appendChild(noteElement);
    });

    // Also update folder notes for custom folders
    this.updateFolderNotes();
  }

  // Update only the active state in existing DOM note lists without full re-render
  setActiveNoteInList(noteId) {
    // Clear previous active in main notes list
    const prevActive = this.notesList.querySelector('.note-item.active');
    if (prevActive && prevActive.getAttribute('data-note-id') !== noteId) {
      prevActive.classList.remove('active');
    }

    // Set new active in main notes list
    const newActive = this.notesList.querySelector(`.note-item[data-note-id="${noteId}"]`);
    if (newActive) {
      newActive.classList.add('active');
    }

    // Also update any folder note lists
    document.querySelectorAll('.folder-notes-container[data-folder-id]').forEach((container) => {
      const prev = container.querySelector('.folder-note-item.active');
      if (prev && prev.getAttribute('data-note-id') !== noteId) {
        prev.classList.remove('active');
      }
      const current = container.querySelector(`.folder-note-item[data-note-id="${noteId}"]`);
      if (current) {
        current.classList.add('active');
      }
    });

    // If folder item wasn't found (likely due to render timing), retry once on the next frame
    const foundInFolder = Array.from(
      document.querySelectorAll('.folder-notes-container[data-folder-id]')
    ).some((container) => !!container.querySelector(`.folder-note-item[data-note-id="${noteId}"]`));
    if (!foundInFolder) {
      requestAnimationFrame(() => {
        document
          .querySelectorAll('.folder-notes-container[data-folder-id]')
          .forEach((container) => {
            const current = container.querySelector(`.folder-note-item[data-note-id="${noteId}"]`);
            if (current) {
              current.classList.add('active');
            }
          });
      });

      // Also schedule a fallback after a short delay in case other async updates occur
      setTimeout(() => {
        document
          .querySelectorAll('.folder-notes-container[data-folder-id]')
          .forEach((container) => {
            const current = container.querySelector(`.folder-note-item[data-note-id="${noteId}"]`);
            if (current) {
              current.classList.add('active');
            }
          });
      }, 50);
    }
  }

  clearActiveNoteInList() {
    // Clear active from main notes list
    const activeNote = this.notesList.querySelector('.note-item.active');
    if (activeNote) {
      activeNote.classList.remove('active');
    }

    // Clear active from folder note lists
    document.querySelectorAll('.folder-notes-container[data-folder-id]').forEach((container) => {
      const activeInFolder = container.querySelector('.folder-note-item.active');
      if (activeInFolder) {
        activeInFolder.classList.remove('active');
      }
    });
  }

  updateFolderNotes() {
    // Skip rendering during window resize for better performance; redone when resizing ends
    if (this.isResizing) {
      this.renderPendingAfterResize = true;
      return;
    }
    document
      .querySelectorAll('.folder-notes-container[data-folder-id]')
      .forEach((container) => this.renderFolderNotes(container));
  }

  isCreatedToday(note) {
    return new Date(note.createdAt).toDateString() === new Date().toDateString();
  }

  currentSearchTerm() {
    return this.normalizeForSearch(this.searchInput ? this.searchInput.value : '');
  }

  // Whether a note passes the selected filter (today / favorites) and the search term.
  // Folder membership is up to the caller.
  matchesCurrentView(note, searchTerm = this.currentSearchTerm()) {
    if (this.currentFilter === 'today' && !this.isCreatedToday(note)) return false;
    if (this.currentFilter === 'favorites' && !note.isFavorite) return false;
    return !searchTerm || this.noteMatchesSearch(note, searchTerm);
  }

  // While filtering or searching, folders without matching notes are hidden
  isViewFiltered() {
    return this.currentFilter !== 'all' || !!this.currentSearchTerm();
  }

  // Notes shown in the root list (folderless ones)
  getFilteredNotes() {
    return this.notes.filter((note) => !note.folderId && this.matchesCurrentView(note));
  }

  // Compute how many notes match the current filter/search including notes inside folders
  getVisibleNotesCount() {
    return this.notes.filter((note) => this.matchesCurrentView(note)).length;
  }

  // Normalize strings for search (lowercase, trim)
  normalizeForSearch(text) {
    // Locale-aware so Turkish I/İ fold correctly
    return String(text || '')
      .toLocaleLowerCase(this.getLocale())
      .trim();
  }

  // Visible text of a note (no HTML markup), cached until the content changes
  searchableText(note) {
    if (!this.searchTextCache) this.searchTextCache = new WeakMap();
    const cached = this.searchTextCache.get(note);
    if (cached && cached.content === note.content) return cached.text;
    const raw = note.isMarkdown ? note.content : this.getPlainText(note.content);
    const text = this.normalizeForSearch(raw);
    this.searchTextCache.set(note, { content: note.content, text });
    return text;
  }

  // Words describing a note's mood and weather: their names in the UI language plus English keywords
  moodWeatherSearchWords(note) {
    const words = [
      this.findMoodButton(note.mood)?.title,
      this.findWeatherButton(note.weather)?.title,
      ...(MOOD_KEYWORDS[note.mood] || []),
      ...(WEATHER_KEYWORDS[note.weather] || []),
    ];
    return words.map((word) => this.normalizeForSearch(word || '')).filter(Boolean);
  }

  // Decide if a note matches searchTerm, including mood/weather keyword mapping
  noteMatchesSearch(note, searchTerm) {
    if (this.normalizeForSearch(note.title).includes(searchTerm)) return true;
    if (this.searchableText(note).includes(searchTerm)) return true;
    if ((note.tags || []).some((tag) => this.normalizeForSearch(tag).includes(searchTerm)))
      return true;

    // Mood and weather match a word that starts with the search term
    return (
      searchTerm.length >= 2 &&
      this.moodWeatherSearchWords(note).some((word) => word.startsWith(searchTerm))
    );
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

  // One sidebar entry for a note, used by the root list and inside folders
  createNoteItem(note, inFolder = false) {
    const div = document.createElement('div');
    div.className = inFolder
      ? 'nav-subitem folder-note-item note-item fade-in'
      : 'note-item fade-in';
    div.draggable = true;
    div.setAttribute('data-note-id', note.id);
    div.classList.toggle('active', !!this.currentNote && this.currentNote.id === note.id);
    div.classList.toggle('pinned', !!note.isPinned);
    div.classList.toggle('locked', !!note.isLocked);

    const title = note.title || i18n.t('messages.untitledNote');
    // Long titles are shortened by CSS; the full title shows as a tooltip
    div.title = title;

    div.innerHTML = `
            <i class="fas ${note.isPinned ? 'fa-thumbtack' : 'fa-file-alt'} nav-icon"></i>
            <span class="nav-text note-item-title">${this.escapeHtml(title)}</span>
            <div class="note-options-container">
                <button class="more-options-btn" title="${i18n.t('titles.options')}">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
                <div class="note-options-menu hidden" data-note-id="${note.id}">
                    <button class="note-action-menu-btn favorite-btn ${note.isFavorite ? 'favorited' : ''}" data-note-id="${note.id}">
                        <i class="fas fa-heart"></i>
                        <span>${note.isFavorite ? i18n.t('messages.removeFromFavorites') : i18n.t('messages.addToFavorites')}</span>
                    </button>
                    <button class="note-action-menu-btn pin-btn ${note.isPinned ? 'pinned' : ''}" data-note-id="${note.id}">
                        <i class="fas fa-thumbtack"></i>
                        <span>${note.isPinned ? i18n.t('messages.unpinNote') : i18n.t('messages.pinNote')}</span>
                    </button>
                    <button class="note-action-menu-btn lock-btn ${note.isLocked ? 'locked' : ''}" data-note-id="${note.id}">
                        <i class="fas fa-lock"></i>
                        <span>${note.isLocked ? i18n.t('messages.unlockNote') : i18n.t('messages.lockNote')}</span>
                    </button>
                    <button class="note-action-menu-btn delete-btn" data-note-id="${note.id}">
                        <i class="fas fa-trash"></i>
                        <span>${i18n.t('messages.deleteNote')}</span>
                    </button>
                </div>
            </div>
        `;

    // Selecting the note, unless the click was inside the options menu
    div.addEventListener('click', (e) => {
      if (!e.target.closest('.note-options-container')) this.selectNote(note);
    });

    const moreOptionsBtn = div.querySelector('.more-options-btn');
    const optionsMenu = div.querySelector('.note-options-menu');
    const optionsContainer = div.querySelector('.note-options-container');
    moreOptionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleNoteMenu(moreOptionsBtn, optionsMenu, optionsContainer);
    });

    const actions = {
      '.favorite-btn': () => this.toggleFavorite(note.id),
      '.pin-btn': () => this.togglePin(note.id),
      '.lock-btn': () => this.toggleLock(note.id),
      '.delete-btn': () => this.deleteNoteById(note.id),
    };
    Object.entries(actions).forEach(([selector, action]) => {
      div.querySelector(selector).addEventListener('click', (e) => {
        e.stopPropagation();
        action();
      });
    });

    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', note.id);
      div.classList.add('dragging');
    });
    div.addEventListener('dragend', () => {
      div.classList.remove('dragging');
    });

    return div;
  }

  // Open a note's option menu (closing any other) or close it if it is open.
  // The menu moves to <body> so the sidebar cannot clip it.
  toggleNoteMenu(button, menu, container) {
    const wasHidden = menu.classList.contains('hidden');

    document.querySelectorAll('.note-options-menu:not(.hidden)').forEach((open) => {
      open.classList.add('hidden');
      open.style.display = 'none';
    });
    document.querySelectorAll('.note-options-container.menu-open').forEach((open) => {
      open.classList.remove('menu-open');
    });
    if (!wasHidden) return;

    if (menu.parentNode !== document.body) document.body.appendChild(menu);
    const rect = button.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = 'auto';
    menu.style.right = `${window.innerWidth - rect.right}px`;
    menu.style.display = 'flex';
    menu.classList.remove('hidden');
    container.classList.add('menu-open');
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

  // Search, sort, filters and closing open menus/dropdowns
  setupNoteListEvents() {
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

    // Search and filters
    this.searchInput.addEventListener('input', (e) => this.searchNotes(e.target.value));

    // New control buttons
    this.searchBtn?.addEventListener('click', () => this.toggleSearch());

    this.sortBtn?.addEventListener('click', () => this.toggleSort());

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
  }
}
