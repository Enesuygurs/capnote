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

    // The custom order: the notes and the unpinned folders share one list; in the other orders the
    // unpinned folders have their own list below the notes
    const items =
      this.currentSort === 'manual'
        ? this.rootListItems(sortedNotes)
        : sortedNotes.map((note) => ({ note }));
    // On top, the pinned notes and pinned folders together, in the order they were pinned
    const pinned = this.pinnedListItems([
      ...items.filter((item) => item.note?.isPinned),
      ...this.childFolders(null)
        .filter((folder) => folder.isPinned)
        .map((folder) => ({ folder })),
    ]);
    const rest = items.filter((item) => !item.note?.isPinned);
    let hasFolders = false;
    [...pinned, ...rest].forEach(({ note, folder }) => {
      if (note) {
        this.notesList.appendChild(this.createNoteItem(note));
      } else if (!this.isViewFiltered() || this.getVisibleCountForFolder(folder.id)) {
        this.notesList.appendChild(this.createFolderElement(folder));
        hasFolders = true;
      }
    });
    if (hasFolders) this.restoreFolderExpansion();
    this.renderEmptyNotesList();

    // Also update folder notes for custom folders
    this.updateFolderNotes();
  }

  // Nothing in the list: no notes yet (a way to write the first one), or none matching the
  // search and filters
  renderEmptyNotesList() {
    if (this.getVisibleNotesCount() > 0) return;
    const hasNotes = this.notes.some((note) => !note.isArchived);
    const empty = document.createElement('div');
    empty.className = 'notes-list-empty';
    if (hasNotes) {
      empty.textContent = i18n.t('noteList.noMatch');
    } else {
      empty.innerHTML =
        '<p></p><button type="button" class="btn-tinted btn-small"><i class="fas fa-pen"></i> <span></span></button>';
      empty.querySelector('p').textContent = i18n.t('noteList.empty');
      empty.querySelector('span').textContent = i18n.t('noteList.writeFirst');
      empty.querySelector('button').addEventListener('click', () => this.createNewNote());
    }
    this.notesList.appendChild(empty);
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
    // The top folders' containers: each one draws the folders inside it (and their notes)
    document.querySelectorAll('.folder-notes-container[data-folder-id]').forEach((container) => {
      if (!container.parentElement.closest('.folder-notes-container')) {
        this.renderFolderNotes(container);
      }
    });
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
    // Archived notes stay out of the list; the archive page shows them
    if (note.isArchived) return false;
    if (this.currentFilter === 'today' && !this.isCreatedToday(note)) return false;
    if (this.currentFilter === 'favorites' && !note.isFavorite) return false;
    if (this.currentTag && !this.noteHasTag(note, this.currentTag)) return false;
    return !searchTerm || this.noteMatchesSearch(note, searchTerm);
  }

  // While filtering or searching, folders without matching notes are hidden
  isViewFiltered() {
    return this.currentFilter !== 'all' || !!this.currentTag || !!this.currentSearchTerm();
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

  // "#word" in the search must match one of the note's tags (a tag starting with the word, so "#wo"
  // finds "work") or a "#word" written in its text; the rest of the search is matched as usual
  noteMatchesSearch(note, searchTerm) {
    const words = searchTerm.split(/\s+/).filter(Boolean);
    const hashtags = words.filter((w) => w.length > 1 && w.startsWith('#'));
    const rest = words.filter((w) => !w.startsWith('#')).join(' ');
    if (!hashtags.every((tag) => this.noteMatchesHashtag(note, tag))) return false;
    return !rest || this.noteMatchesText(note, rest);
  }

  noteMatchesHashtag(note, hashtag) {
    const word = hashtag.slice(1);
    return (
      (note.tags || []).some((tag) =>
        this.normalizeForSearch(tag).replace(/^#/, '').startsWith(word)
      ) || this.searchableText(note).includes(hashtag)
    );
  }

  // Decide if a note matches searchTerm, including mood/weather keyword mapping
  noteMatchesText(note, searchTerm) {
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
      // Always show pinned notes first, in their own order
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isPinned && b.isPinned) return this.pinKey(a) - this.pinKey(b);

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

  // The open note's entry in the list follows its title as it is typed, before it is saved
  showTitleInList(title = this.noteTitle.value.trim()) {
    if (!this.currentNote) return;
    const text = title || i18n.t('messages.untitledNote');
    document
      .querySelectorAll(`.note-item[data-note-id="${CSS.escape(this.currentNote.id)}"]`)
      .forEach((item) => {
        item.title = text;
        const label = item.querySelector('.note-item-title');
        if (label) label.textContent = text;
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

    const title = this.displayTitle(note);
    // Long titles are shortened by CSS; the full title shows as a tooltip
    div.title = title;

    // A pinned note shows its pin (even when locked); a locked one its lock, open while it is opened
    // for this session
    const icon = note.isPinned
      ? 'fas fa-thumbtack tone-gold'
      : note.isLocked
        ? this.unlockedNotes.has(String(note.id))
          ? 'fas fa-lock-open tone-accent'
          : 'fas fa-lock tone-accent'
        : note.filePath
          ? this.fileNoteIcon(note)
          : 'fas fa-file-lines';
    if (note.filePath) div.title = `${title}\n${note.filePath}`;
    div.innerHTML = `
            <i class="${icon} nav-icon"></i>
            <span class="nav-text note-item-title">${this.escapeHtml(title)}</span>
            ${note.isFavorite ? '<i class="fas fa-heart note-item-favorite tone-heart" aria-hidden="true"></i>' : ''}
        `;

    div.classList.toggle('is-selected', this.selectedNoteIds.has(note.id));
    // Ctrl/Cmd+click picks the note for a selection; a plain click opens it
    div.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) {
        this.toggleSelection('note', note.id);
        return;
      }
      this.clearSelection();
      this.selectNote(note);
    });
    div.addEventListener('dblclick', (e) => {
      if (e.ctrlKey || e.metaKey) return;
      if (!this.isOnTextOf(div.querySelector('.note-item-title'), e)) return;
      this.startRenameNote(note, div);
    });
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.showSelectionMenuIfSelected(e.clientX, e.clientY, 'note', note.id)) return;
      this.showNoteContextMenu(e.clientX, e.clientY, note.id);
    });

    div.addEventListener('dragstart', (e) => {
      // A pinned note moves only among the pinned ones of its list
      e.dataTransfer.setData('text/plain', note.id);
      this.draggedNoteId = note.id;
      div.classList.add('dragging');
      if (note.isPinned) this.showPinZone({ note });
      // A note in a folder can be dropped on the root list, which then needs room even if empty.
      // Changing the layout during dragstart cancels the drag, so wait a frame.
      if (note.folderId) {
        requestAnimationFrame(() => document.body.classList.add('dragging-folder-note'));
      }
    });
    div.addEventListener('dragend', () => {
      this.hidePinZone();
      this.draggedNoteId = null;
      div.classList.remove('dragging');
      document.body.classList.remove('dragging-folder-note');
      document.getElementById('notesListContainer')?.classList.remove('drag-over');
    });

    // Dropping another note on this row places it before or after this one
    const dropBefore = (e) => {
      const rect = div.getBoundingClientRect();
      return e.clientY < rect.top + rect.height / 2;
    };
    // A folder dragged over a note of the root list goes before or after it (a pinned folder only
    // among the pinned notes and folders)
    const takesFolder = () =>
      this.draggedFolderId && !note.folderId && !note.isPinned && !this.pinnedDragItem();
    div.addEventListener('dragover', (e) => {
      // A pinned note or folder dragged: it goes before or after a pinned note of its list only
      const pinned = this.pinnedDragItem();
      if (pinned) {
        if (!this.canPlaceAmongPinned(pinned, { note })) return;
        e.preventDefault();
        e.stopPropagation();
        const before = dropBefore(e);
        div.classList.toggle('insert-before', before);
        div.classList.toggle('insert-after', !before);
        return;
      }
      if (takesFolder()) {
        e.preventDefault();
        e.stopPropagation();
        const before = dropBefore(e);
        div.classList.toggle('insert-before', before);
        div.classList.toggle('insert-after', !before);
        return;
      }
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
      const pinned = this.pinnedDragItem();
      if (pinned) {
        if (!this.canPlaceAmongPinned(pinned, { note })) return;
        e.preventDefault();
        e.stopPropagation();
        this.placeAmongPinned(pinned, { note }, dropBefore(e));
        return;
      }
      if (takesFolder()) {
        e.preventDefault();
        e.stopPropagation();
        const folder = this.folders.find((f) => f.id === this.draggedFolderId);
        if (folder && this.folderParentId(folder)) {
          // A folder taken out of another one comes to the top of the list
          delete folder.parentId;
          delete folder.order;
        }
        if (folder) this.placeInRootList([{ folder }], { note }, dropBefore(e));
        return;
      }
      if (!this.draggedNoteId || this.draggedNoteId === note.id) return;
      e.preventDefault();
      e.stopPropagation();
      const ids = this.draggedNoteIds(this.draggedNoteId);
      if (!ids.includes(note.id)) this.reorderNote(ids, note.id, dropBefore(e));
    });

    return div;
  }

  // The root list in the custom order: the given notes (no folder, sorted) and the unpinned
  // folders. A note or folder dragged into place has an order; notes without one come first (the
  // newest on top), folders without one after everything, in their own order.
  // Pin or unpin a note or folder. When it was pinned is kept, so the pinned notes and folders
  // stay in the order they were pinned in (a newly pinned one comes after the others).
  setPinned(item, pinned) {
    item.isPinned = pinned;
    delete item.pinOrder;
    if (pinned) item.pinnedAt = new Date().toISOString();
    else delete item.pinnedAt;
  }

  // Where a pinned note or folder stands among the pinned ones: its place once they were put in
  // order by dragging, else when it was pinned (ones pinned before this was kept come first)
  pinKey(item) {
    return item.pinOrder ?? (Date.parse(item.pinnedAt) || 0);
  }

  // The pinned notes and folders of the root list together, in their order
  pinnedListItems(items) {
    return items.sort((x, y) => this.pinKey(x.note || x.folder) - this.pinKey(y.note || y.folder));
  }

  // ============ Reordering the pinned ones ============
  // A pinned note or folder is dragged only among the pinned ones of its list: the root list (its
  // pinned notes and folders) or a folder (its pinned notes).

  // The pinned note or folder being dragged, if it is one: { note } or { folder }
  pinnedDragItem() {
    if (this.draggedFolderId) {
      const folder = this.folders.find((f) => f.id === this.draggedFolderId);
      return folder?.isPinned ? { folder } : null;
    }
    if (this.draggedNoteId) {
      const note = this.notes.find((n) => n.id === this.draggedNoteId);
      return note?.isPinned ? { note } : null;
    }
    return null;
  }

  // Which pinned group an item is in: a folder's id, or the root list
  pinGroupOf(item) {
    return item.folder ? 'root' : item.note.folderId || 'root';
  }

  // The rows of a pinned group: the pinned notes (and, in the root list, folders) of a list
  pinZoneRows(item) {
    const group = this.pinGroupOf(item);
    if (group === 'root') {
      // A pinned folder counts whole: with what is in it, when it is open
      return [...this.notesList.children].filter((el) => {
        if (el.classList.contains('note-item')) return el.classList.contains('pinned');
        const id =
          el.classList.contains('folder-container') && el.firstElementChild?.dataset.folderId;
        return !!id && !!this.folders.find((f) => f.id === id)?.isPinned;
      });
    }
    const box = document.querySelector(`.folder-notes-container[data-folder-id="${group}"]`);
    return box ? [...box.children].filter((el) => el.matches('.note-item.pinned')) : [];
  }

  // While a pinned note or folder is dragged, the pinned ones of its list (the only place it can
  // go) are marked with a frame that follows the list as it scrolls
  showPinZone(item) {
    this.hidePinZone();
    const zone = document.createElement('div');
    zone.className = 'pin-zone';
    zone.dataset.label = i18n.t('noteList.pinnedZone');
    const place = () => {
      const rects = this.pinZoneRows(item).map((row) => row.getBoundingClientRect());
      if (!rects.length) {
        zone.hidden = true;
        return;
      }
      const top = Math.min(...rects.map((r) => r.top));
      const bottom = Math.max(...rects.map((r) => r.bottom));
      const left = Math.min(...rects.map((r) => r.left));
      const right = Math.max(...rects.map((r) => r.right));
      Object.assign(zone.style, {
        top: `${top - 3}px`,
        left: `${left - 3}px`,
        width: `${right - left + 6}px`,
        height: `${bottom - top + 6}px`,
      });
      zone.hidden = false;
      this.pinZoneFrame = requestAnimationFrame(place);
    };
    // Changing the page while the drag starts cancels it: the frame comes a moment later
    this.pinZoneFrame = requestAnimationFrame(() => {
      document.body.appendChild(zone);
      place();
    });
    this.pinZone = zone;
  }

  hidePinZone() {
    cancelAnimationFrame(this.pinZoneFrame);
    this.pinZone?.remove();
    this.pinZone = null;
  }

  // Whether the dragged pinned item can be placed before or after this pinned one
  canPlaceAmongPinned(dragged, target) {
    const targetItem = target.note || target.folder;
    if (!dragged || !targetItem?.isPinned) return false;
    if ((dragged.note || dragged.folder) === targetItem) return false;
    return this.pinGroupOf(dragged) === this.pinGroupOf(target);
  }

  // Put a pinned note or folder before or after another pinned one, and number the group in its
  // new order
  async placeAmongPinned(moving, target, before) {
    const group = this.pinGroupOf(moving);
    const items =
      group === 'root'
        ? this.pinnedListItems([
            ...this.notes
              .filter((n) => n.isPinned && !n.folderId && !n.isArchived)
              .map((note) => ({ note })),
            ...this.childFolders(null)
              .filter((f) => f.isPinned)
              .map((folder) => ({ folder })),
          ])
        : this.notes
            .filter((n) => n.isPinned && n.folderId === group && !n.isArchived)
            .sort((x, y) => this.pinKey(x) - this.pinKey(y))
            .map((note) => ({ note }));
    const of = (item) => item.note || item.folder;
    const rest = items.filter((item) => of(item) !== of(moving));
    const at = rest.findIndex((item) => of(item) === of(target));
    if (at === -1) return;
    rest.splice(at + (before ? 0 : 1), 0, moving);
    rest.forEach((item, i) => {
      of(item).pinOrder = i;
    });
    await Promise.all([this.saveNotes(), this.saveFolders()]);
    this.updateNotesList();
    this.updateFoldersList();
  }

  rootListItems(notes) {
    const items = [
      ...notes.map((note) => ({ note, key: note.isPinned ? -Infinity : (note.order ?? -1) })),
      ...this.childFolders(null)
        .filter((folder) => !folder.isPinned)
        .map((folder, i) => ({ folder, key: folder.order ?? 1e6 + i })),
    ];
    // A stable sort keeps the notes' own order among equal keys
    return items.sort((x, y) => x.key - y.key);
  }

  // Put notes and folders of the root list before or after a note or folder of it, then number
  // the whole list in its new order and switch to the custom order. Each item is { note } or
  // { folder }.
  async placeInRootList(moving, target, before) {
    const same = (x, y) => (x.note && x.note === y.note) || (x.folder && x.folder === y.folder);
    const rootNotes = this.notes.filter((n) => !n.folderId && !n.isArchived);
    // The list as it is shown now (in another order, the notes first and the folders after them)
    const items =
      this.currentSort === 'manual'
        ? this.rootListItems(this.getSortedNotes(rootNotes))
        : [
            ...this.getSortedNotes(rootNotes).map((note) => ({ note })),
            ...this.childFolders(null)
              .filter((f) => !f.isPinned)
              .map((folder) => ({ folder })),
          ];
    const rest = items.filter((item) => !moving.some((m) => same(m, item)));
    const at = rest.findIndex((item) => same(item, target));
    if (at === -1) return;
    rest.splice(at + (before ? 0 : 1), 0, ...moving);
    rest.forEach((item, i) => {
      (item.note || item.folder).order = i;
    });
    if (this.currentSort !== 'manual') this.changeSorting('manual');
    await Promise.all([this.saveNotes(), this.saveFolders()]);
    this.updateNotesList();
    this.updateFoldersList();
  }

  // Place a note before or after another one (moving it into that note's folder if needed) and
  // switch the list to the custom order
  // sourceId may be one id or several (a dragged selection, kept in its shown order)
  async reorderNote(sourceId, targetId, before) {
    const ids = Array.isArray(sourceId) ? sourceId : [sourceId];
    const target = this.notes.find((n) => n.id === targetId);
    const sources = this.notes.filter((n) => ids.includes(n.id) && n !== target);
    if (!sources.length || !target) return;

    // In the root list the folders take part in the order too
    if (!target.folderId) {
      sources.forEach((source) => {
        if (source.folderId) source.folderId = null;
      });
      const moving = this.getSortedNotes([...sources]).map((note) => ({ note }));
      return this.placeInRootList(moving, { note: target }, before);
    }

    const folderId = target.folderId || null;
    sources.forEach((source) => {
      // Moving is not an edit: "last edited" stays as it was
      if ((source.folderId || null) !== folderId) source.folderId = folderId;
    });
    const moving = this.getSortedNotes([...sources]);
    // Number the notes of that list in the order they are shown now, with the notes in their new place
    const siblings = this.getSortedNotes(
      this.notes.filter((n) => !sources.includes(n) && (n.folderId || null) === folderId)
    );
    siblings.splice(siblings.indexOf(target) + (before ? 0 : 1), 0, ...moving);
    siblings.forEach((n, i) => {
      n.order = i;
    });

    if (this.currentSort !== 'manual') this.changeSorting('manual');
    await this.saveNotes();
    this.updateNotesList();
    this.updateFoldersList();
  }

  // Play the "cannot move" shake on a row
  shakeRow(row) {
    // The row's appear animation would replay when the shake ends and blink the row out
    row.classList.remove('fade-in', 'shake');
    void row.offsetWidth; // restart the animation if it is already running
    row.classList.add('shake');
    row.addEventListener('animationend', () => row.classList.remove('shake'), { once: true });
  }

  // The right-click menu of a note: its labels follow the note's current state
  showNoteContextMenu(x, y, noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;
    this.hideContextMenu();
    this.hideSelectionMenu?.();
    this.hideListContextMenu();
    this.contextNoteId = noteId;

    const label = (action, key) => {
      this.noteContextMenu.querySelector(`[data-action="${action}"] span`).textContent =
        i18n.t(key);
    };
    label('favorite', note.isFavorite ? 'messages.removeFromFavorites' : 'messages.addToFavorites');
    label('pin', note.isPinned ? 'messages.unpinNote' : 'messages.pinNote');
    label('lock', note.isLocked ? 'messages.unlockNote' : 'messages.lockNote');
    // A locked note cannot be copied or renamed without its password
    this.noteContextMenu.querySelector('[data-action="duplicate"]').disabled =
      this.isNoteLockedForView(note);
    this.noteContextMenu.querySelector('[data-action="rename"]').disabled =
      this.isNoteLockedForView(note);
    // A file note is its file: it is not locked, copied or archived
    ['lock', 'duplicate', 'archive'].forEach((action) => {
      this.noteContextMenu.querySelector(`[data-action="${action}"]`).hidden =
        this.isFileNote(note);
    });

    this.positionMenu(this.noteContextMenu, x, y);
  }

  hideListContextMenu() {
    this.listContextMenu?.classList.add('hidden');
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
    // Folders hidden by the previous filter come back (and empty ones hide)
    this.updateFoldersList();
  }

  changeSorting(sort) {
    this.currentSort = sort;
    this.markSortOption(sort);
    if (this.settings.noteSort !== sort) this.setSetting('noteSort', sort);
    // The custom order puts the folders among the notes, the others below them
    this.updateNotesList();
    this.updateFoldersList();
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
        // The title edited in place in the list, as with a double-click
        rename: () =>
          this.startRenameNote(
            note,
            document.querySelector(`.note-item[data-note-id="${noteId}"]`)
          ),
        duplicate: () => this.duplicateNote(note),
        archive: () => this.setArchived([note], true),
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

    // Right-click on an empty spot of the notes area: a new note or a new folder
    this.sidebarContent?.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.note-item, .folder-item, input, textarea')) return;
      e.preventDefault();
      this.hideNoteContextMenu();
      this.hideContextMenu();
      this.hideSelectionMenu?.();
      this.positionMenu(this.listContextMenu, e.clientX, e.clientY);
    });
    this.listContextMenu?.addEventListener('click', (e) => {
      const item = e.target.closest('[data-action]');
      if (!item) return;
      e.stopPropagation();
      this.hideListContextMenu();
      if (item.dataset.action === 'newNote') this.createNewNote();
      else if (item.dataset.action === 'newFolder') this.showFolderModal();
    });
    const closeListMenu = () => this.hideListContextMenu();
    document.addEventListener('click', closeListMenu);
    document.addEventListener('contextmenu', (e) => {
      if (!this.sidebarContent?.contains(e.target) || e.target.closest('.note-item, .folder-item'))
        closeListMenu();
    });
    window.addEventListener('blur', closeListMenu);
    window.addEventListener('resize', closeListMenu);
    this.sidebarContent?.addEventListener('scroll', closeListMenu, { passive: true });

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
