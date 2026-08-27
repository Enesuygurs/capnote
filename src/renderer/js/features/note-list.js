// Sidebar note list: rendering, filtering, sorting and search

import { i18n } from '../i18n.js';
import { MOOD_KEYWORDS, WEATHER_KEYWORDS } from '../data/moods.js';

export class NoteListFeature {
  updateNotesList() {
    // Skip rendering during window resize for better performance; redone when resizing ends
    if (this.isResizing) {
      this.renderPendingAfterResize = true;
      return;
    }

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
        case 'manual':
          // Dragged notes keep their place; newer notes without one come first
          return (a.order ?? -1) - (b.order ?? -1) || new Date(b.createdAt) - new Date(a.createdAt);
        default:
          return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      }
    });
  }

  // One sidebar entry for a note, used by the root list and inside folders.
  // The icon shows a locked or pinned note; a heart on the right marks a favorite.
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

    const icon = note.isLocked
      ? 'fa-lock'
      : note.isPinned
        ? 'fa-thumbtack tone-gold'
        : 'fa-file-lines';
    div.innerHTML = `
            <i class="fas ${icon} nav-icon"></i>
            <span class="nav-text note-item-title">${this.escapeHtml(title)}</span>
            ${note.isFavorite ? '<i class="fas fa-heart note-item-favorite tone-rose" aria-hidden="true"></i>' : ''}
        `;

    div.addEventListener('click', () => this.selectNote(note));
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showNoteContextMenu(e.clientX, e.clientY, note.id);
    });

    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', note.id);
      this.draggedNoteId = note.id;
      div.classList.add('dragging');
    });
    div.addEventListener('dragend', () => {
      this.draggedNoteId = null;
      div.classList.remove('dragging');
    });

    // Dropping another note on this row places it before or after this one
    const dropBefore = (e) => {
      const rect = div.getBoundingClientRect();
      return e.clientY < rect.top + rect.height / 2;
    };
    div.addEventListener('dragover', (e) => {
      if (!this.draggedNoteId || this.draggedNoteId === note.id) return;
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('notesListContainer')?.classList.remove('drag-over');
      const before = dropBefore(e);
      div.classList.toggle('insert-before', before);
      div.classList.toggle('insert-after', !before);
    });
    div.addEventListener('dragleave', () => div.classList.remove('insert-before', 'insert-after'));
    div.addEventListener('drop', (e) => {
      div.classList.remove('insert-before', 'insert-after');
      if (!this.draggedNoteId || this.draggedNoteId === note.id) return;
      e.preventDefault();
      e.stopPropagation();
      this.reorderNote(this.draggedNoteId, note.id, dropBefore(e));
    });

    return div;
  }

  // Place a note before or after another one (moving it into that note's folder if needed) and
  // switch the list to the custom order
  async reorderNote(sourceId, targetId, before) {
    const source = this.notes.find((n) => n.id === sourceId);
    const target = this.notes.find((n) => n.id === targetId);
    if (!source || !target || source === target) return;

    const folderId = target.folderId || null;
    if ((source.folderId || null) !== folderId) {
      source.folderId = folderId;
      source.updatedAt = new Date().toISOString();
    }
    // Number the notes of that list in the order they are shown now, with the note in its new place
    const siblings = this.getSortedNotes(
      this.notes.filter((n) => n !== source && (n.folderId || null) === folderId)
    );
    siblings.splice(siblings.indexOf(target) + (before ? 0 : 1), 0, source);
    siblings.forEach((n, i) => {
      n.order = i;
    });

    if (this.currentSort !== 'manual') this.changeSorting('manual');
    await this.saveNotes();
    this.updateNotesList();
    this.updateFoldersList();
  }

  // The right-click menu of a note: its labels follow the note's current state
  showNoteContextMenu(x, y, noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;
    this.hideContextMenu();
    this.contextNoteId = noteId;

    const label = (action, key) => {
      this.noteContextMenu.querySelector(`[data-action="${action}"] span`).textContent =
        i18n.t(key);
    };
    label('favorite', note.isFavorite ? 'messages.removeFromFavorites' : 'messages.addToFavorites');
    label('pin', note.isPinned ? 'messages.unpinNote' : 'messages.pinNote');
    label('lock', note.isLocked ? 'messages.unlockNote' : 'messages.lockNote');
    // A locked note cannot be copied without its password
    this.noteContextMenu.querySelector('[data-action="duplicate"]').disabled =
      this.isNoteLockedForView(note);

    this.positionMenu(this.noteContextMenu, x, y);
  }

  hideNoteContextMenu() {
    this.noteContextMenu?.classList.add('hidden');
    this.contextNoteId = null;
  }

  // Show a fixed menu at the pointer, kept inside the window
  positionMenu(menu, x, y) {
    menu.classList.remove('hidden');
    const margin = 8;
    const { width, height } = menu.getBoundingClientRect();
    menu.style.left = Math.max(margin, Math.min(x, window.innerWidth - width - margin)) + 'px';
    menu.style.top = Math.max(margin, Math.min(y, window.innerHeight - height - margin)) + 'px';
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
    this.markSortOption(sort);
    if (this.settings.noteSort !== sort) this.setSetting('noteSort', sort);
    this.updateNotesList();
    this.updateFolderNotes();
  }

  markSortOption(sort) {
    document.querySelectorAll('.sort-option').forEach((option) => {
      option.classList.toggle('active', option.dataset.value === sort);
    });
  }

  setSortOrder(sort) {
    this.changeSorting(sort);
  }

  // The search field is always visible; this moves the cursor into it
  toggleSearch() {
    this.sortDropdown.classList.add('hidden');
    this.sortBtn.classList.remove('active');
    this.searchInput.focus();
    this.searchInput.select();
  }

  toggleSort() {
    const isHidden = this.sortDropdown.classList.contains('hidden');

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
    // The note context menu: run the chosen action, then close
    this.noteContextMenu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-action]');
      if (!item || item.disabled) return;
      e.stopPropagation();
      const noteId = this.contextNoteId;
      const note = this.notes.find((n) => n.id === noteId);
      this.hideNoteContextMenu();
      if (!note) return;
      const actions = {
        favorite: () => this.toggleFavorite(noteId),
        pin: () => this.togglePin(noteId),
        lock: () => this.toggleLock(noteId),
        duplicate: () => this.duplicateNote(note),
        delete: () => this.deleteNoteById(noteId),
      };
      actions[item.dataset.action]?.();
    });
    const closeNoteMenu = () => this.hideNoteContextMenu();
    document.addEventListener('click', closeNoteMenu);
    document.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('.note-item')) closeNoteMenu();
    });
    window.addEventListener('blur', closeNoteMenu);
    window.addEventListener('resize', closeNoteMenu);
    this.sidebarContent?.addEventListener('scroll', closeNoteMenu, { passive: true });

    // Search and filters
    this.searchInput.addEventListener('input', (e) => this.searchNotes(e.target.value));

    this.sortBtn?.addEventListener('click', () => this.toggleSort());

    // Sort dropdown options
    document.querySelectorAll('.sort-option').forEach((option) => {
      option.addEventListener('click', (e) => {
        // Apply sort (marks the chosen option)
        this.setSortOrder(e.currentTarget.dataset.value);
        // Close dropdown
        this.sortDropdown.classList.add('hidden');
        this.sortBtn.classList.remove('active');
      });
    });

    // List filters (all / today / favorites)
    this.filterTabs.forEach((item) => {
      item.addEventListener('click', (e) => {
        const clickedFilter = e.currentTarget.dataset.filter;

        // Toggle functionality: if clicking the same filter, deactivate it
        if (this.currentFilter === clickedFilter) {
          this.changeFilter('all');
        } else {
          this.changeFilter(clickedFilter);
        }
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-section-controls') && !e.target.closest('.sort-dropdown')) {
        this.sortDropdown?.classList.add('hidden');
        this.sortBtn?.classList.remove('active');
      }
    });
  }
}
