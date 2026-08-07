// Sidebar note list: rendering, filtering, sorting and search

import { i18n } from '../i18n.js';

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

    this.discardDetachedMenus();

    // Update custom folder notes
    document.querySelectorAll('.folder-notes-container[data-folder-id]').forEach((container) => {
      const folderId = container.getAttribute('data-folder-id');
      container.innerHTML = '';
      let folderNotes = this.notes.filter((note) => note.folderId === folderId);

      // Apply current filter to folder notes
      switch (this.currentFilter) {
        case 'today':
          folderNotes = folderNotes.filter((note) => this.isCreatedToday(note));
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
        const folderObj = this.folders.find((f) => f.id === folderId);
        const folderNameMatches =
          folderObj && this.normalizeForSearch(folderObj.name || '').includes(searchTerm);
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

  isCreatedToday(note) {
    return new Date(note.createdAt).toDateString() === new Date().toDateString();
  }

  getFilteredNotes() {
    let filtered = [...this.notes];

    // Filter by type
    switch (this.currentFilter) {
      case 'today':
        filtered = filtered.filter((note) => this.isCreatedToday(note) && !note.folderId);
        break;
      case 'favorites':
        filtered = filtered.filter((note) => note.isFavorite && !note.folderId);
        break;
      default:
        // Show only notes without folder (klasörsüz)
        filtered = filtered.filter((note) => !note.folderId);
        break;
    }

    // Search filter (include mood/weather keywords and emoji)
    const rawSearch =
      this.searchInput && this.searchInput.value ? String(this.searchInput.value) : '';
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
        matched = matched.filter((note) => this.isCreatedToday(note));
        break;
      case 'favorites':
        matched = matched.filter((note) => note.isFavorite);
        break;
      default:
        // no folder restriction here: include all notes for the default 'all' view
        break;
    }

    if (searchTerm) {
      matched = matched.filter((note) => this.noteMatchesSearch(note, searchTerm));
    }

    return matched.length;
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

  // Words describing a mood/weather emoji: its label in the UI language plus English keywords
  emojiSearchWords(emoji) {
    const button = [...this.moodBtns, ...this.weatherBtns].find(
      (btn) => (btn.dataset.mood || btn.dataset.weather) === emoji
    );
    if (!this._emojiKeywordMap) this._emojiKeywordMap = this._buildEnglishEmojiKeywordMap();
    const words = [button ? button.title : '', ...(this._emojiKeywordMap[emoji] || [])];
    return words.map((word) => this.normalizeForSearch(word)).filter(Boolean);
  }

  // Decide if a note matches searchTerm, including mood/weather keyword mapping
  noteMatchesSearch(note, searchTerm) {
    if (this.normalizeForSearch(note.title).includes(searchTerm)) return true;
    if (this.searchableText(note).includes(searchTerm)) return true;
    if ((note.tags || []).some((tag) => this.normalizeForSearch(tag).includes(searchTerm)))
      return true;

    // Mood and weather match by the emoji itself or a word that starts with the search term
    return [note.mood, note.weather]
      .filter(Boolean)
      .some(
        (emoji) =>
          emoji.includes(searchTerm) ||
          (searchTerm.length >= 2 &&
            this.emojiSearchWords(emoji).some((word) => word.startsWith(searchTerm)))
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
            <div class="note-options-container">
                <button class="more-options-btn" title="${i18n.t('titles.options')}">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
                <div class="note-options-menu hidden" data-note-id="${note.id}">
                    <button class="note-action-menu-btn favorite-btn ${note.isFavorite ? 'favorited' : ''}" 
                            data-note-id="${note.id}">
                        <i class="fas fa-heart"></i>
                        <span>${note.isFavorite ? i18n.t('messages.removeFromFavorites') : i18n.t('messages.addToFavorites')}</span>
                    </button>
                    <button class="note-action-menu-btn pin-btn ${note.isPinned ? 'pinned' : ''}" 
                            data-note-id="${note.id}">
                        <i class="fas fa-thumbtack"></i>
                        <span>${note.isPinned ? i18n.t('messages.unpinNote') : i18n.t('messages.pinNote')}</span>
                    </button>
                    <button class="note-action-menu-btn lock-btn ${note.isLocked ? 'locked' : ''}" 
                            data-note-id="${note.id}">
                        <i class="fas fa-lock"></i>
                        <span>${note.isLocked ? i18n.t('messages.unlockNote') : i18n.t('messages.lockNote')}</span>
                    </button>
                    <button class="note-action-menu-btn delete-btn" 
                            data-note-id="${note.id}">
                        <i class="fas fa-trash"></i>
                        <span>${i18n.t('messages.deleteNote')}</span>
                    </button>
                </div>
            </div>
        `;

    // Add event listener for note selection (not for action buttons)
    div.addEventListener('click', (e) => {
      // Only select note if it's not an action button or options container
      if (!e.target.closest('.note-options-container')) {
        this.selectNote(note);
      }
    });

    // Add event listener for more options button
    const moreOptionsBtn = div.querySelector('.more-options-btn');
    const optionsMenu = div.querySelector('.note-options-menu');
    const optionsContainer = div.querySelector('.note-options-container');
    if (moreOptionsBtn && optionsMenu) {
      moreOptionsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = optionsMenu.classList.contains('hidden');

        // Close all other menus
        document.querySelectorAll('.note-options-menu:not(.hidden)').forEach((menu) => {
          menu.classList.add('hidden');
          menu.style.display = 'none';
        });
        document.querySelectorAll('.note-options-container.menu-open').forEach((container) => {
          container.classList.remove('menu-open');
        });

        if (isHidden) {
          // Move to body to prevent clipping/stacking issues
          if (optionsMenu.parentNode !== document.body) {
            document.body.appendChild(optionsMenu);
          }

          // Calculate position for fixed menu
          const rect = moreOptionsBtn.getBoundingClientRect();
          optionsMenu.style.top = `${rect.bottom + 5}px`;
          optionsMenu.style.left = 'auto';
          optionsMenu.style.right = `${window.innerWidth - rect.right}px`;
          optionsMenu.style.display = 'flex';

          optionsMenu.classList.remove('hidden');
          optionsContainer.classList.add('menu-open');
        }
      });
    }

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
    const truncatedTitle =
      note.title.length > 18 ? note.title.substring(0, 18) + '...' : note.title;

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
}
