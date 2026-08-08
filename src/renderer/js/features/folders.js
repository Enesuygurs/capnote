// Folders: create, rename, color, reorder, delete and moving notes between them

import { i18n } from '../i18n.js';

export class FoldersFeature {
  showFolderModal() {
    this._renamingFolderId = null;
    // Ensure modal title/button show create mode
    const titleEl = this.folderModal.querySelector('.modal-title h3');
    const iconEl = this.folderModal.querySelector('.modal-title i');
    const createBtn = document.getElementById('createFolderBtn');
    if (titleEl) titleEl.textContent = i18n.t('messages.newFolder');
    if (iconEl) {
      iconEl.className = 'fas fa-folder-plus';
    }
    if (createBtn) createBtn.textContent = i18n.t('buttons.create');
    this.folderNameInput.value = '';
    this.showModal(this.folderModal);
    this.folderNameInput.focus();
  }

  hideFolderModal() {
    this.hideModal(this.folderModal);
  }

  renameSelectedFolder() {
    if (!this.selectedFolderId) return;
    const folder = this.folders.find((f) => f.id === this.selectedFolderId);
    if (!folder) return;
    // Pre-fill folder modal and set renaming flag
    this.folderNameInput.value = folder.name;
    this._renamingFolderId = folder.id;
    // Update modal to show rename mode
    const titleEl = this.folderModal.querySelector('.modal-title h3');
    const iconEl = this.folderModal.querySelector('.modal-title i');
    const createBtn = document.getElementById('createFolderBtn');
    if (titleEl) titleEl.textContent = i18n.t('messages.renameFolder');
    if (iconEl) {
      iconEl.className = 'fas fa-edit';
    }
    if (createBtn) createBtn.textContent = i18n.t('buttons.save');
    this.showModal(this.folderModal);
    this.folderNameInput.focus();
  }

  async createFolder() {
    const name = this.folderNameInput.value.trim();

    if (!name) {
      this.showNotification(i18n.t('messages.folderNameEmpty'), 'warning');
      return;
    }

    if (name.length > 50) {
      this.showNotification(i18n.t('messages.folderNameTooLong'), 'warning');
      return;
    }

    // Check if folder name exists
    if (this.folders.some((folder) => folder.name.toLowerCase() === name.toLowerCase())) {
      this.showNotification(i18n.t('messages.folderNameExists'), 'warning');
      return;
    }

    // If we're in rename mode, update the existing folder
    if (this._renamingFolderId) {
      const folder = this.folders.find((f) => f.id === this._renamingFolderId);
      if (folder) {
        folder.name = name;
        await this.saveFolders();
        this.updateFoldersList();
        this.hideFolderModal();
        this.showNotification(i18n.t('messages.folderRenamed', { name }), 'success');
      }
      this._renamingFolderId = null;
      return;
    }

    const folder = {
      id: this.newId(),
      name: name,
      createdAt: new Date().toISOString(),
      color: this.getRandomFolderColor(),
      expanded: true,
    };

    this.folders.push(folder);
    await this.saveFolders();
    this.updateFoldersList();
    this.hideFolderModal();
    this.showNotification(i18n.t('messages.folderCreated', { name }), 'success');
    if (this.currentFilter === 'favorites') this.updateNotesList();
  }

  getRandomFolderColor() {
    // If sync-to-accent is enabled, return the accent color
    if (this.settings.syncFolderAccent) {
      return (
        this.settings.accentColor ||
        getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() ||
        '#f59e0b'
      );
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

    // Skip rendering during window resize for better performance; redone when resizing ends
    if (this.isResizing) {
      this.renderPendingAfterResize = true;
      return;
    }

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
    if (!folderId) return;
    const countEl = document.querySelector(
      `.folder-item[data-folder-id="${folderId}"] .folder-count`
    );
    if (!countEl) return;
    // Show visible count depending on current filter/search
    const visibleCount = this.getVisibleCountForFolder(folderId);
    countEl.textContent = visibleCount;
    // If current filter or an active search hides empty folders, toggle visibility of the folder container
    const rawSearch = this.searchInput ? String(this.searchInput.value) : '';
    const searchTerm = this.normalizeForSearch(rawSearch);
    const treatAsFilter = this.currentFilter !== 'all' || !!searchTerm;
    if (treatAsFilter) {
      const folderContainer = document.querySelector(
        `.folder-container:has(.folder-item[data-folder-id="${folderId}"])`
      );
      // Fallback for environments without :has support
      const fallbackContainer =
        folderContainer ||
        document
          .querySelector(`.folder-item[data-folder-id="${folderId}"]`)
          ?.closest('.folder-container');
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
    let folderNotes = this.notes.filter((n) => n.folderId === folderId);

    // Apply current filter
    switch (this.currentFilter) {
      case 'today':
        folderNotes = folderNotes.filter((note) => this.isCreatedToday(note));
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
      const folderObj = this.folders.find((f) => f.id === folderId);
      const folderNameMatches =
        folderObj && this.normalizeForSearch(folderObj.name || '').includes(searchTerm);
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
            <i class="fas fa-folder nav-icon" style="color: ${this.safeColor(folder.color)}"></i>
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
        .querySelectorAll(
          '.folder-item.drag-over, .folder-item.insert-before, .folder-item.insert-after, .default-folder.drag-over, .default-folder.insert-before, .default-folder.insert-after'
        )
        .forEach((el) => el.classList.remove('drag-over', 'insert-before', 'insert-after'));
    });
    folderHeader.addEventListener('dragover', (e) => {
      e.preventDefault();
      // detect if the active drag is a folder (we set 'text/folder-id' during dragstart)
      const types = e.dataTransfer && e.dataTransfer.types ? Array.from(e.dataTransfer.types) : [];
      let isFolderDrag = false;
      try {
        isFolderDrag =
          types.includes('text/folder-id') ||
          Boolean(e.dataTransfer.getData && e.dataTransfer.getData('text/folder-id'));
      } catch (err) {
        // accessing getData during dragover can throw in some browsers; fallback to types check only
        isFolderDrag = types.includes('text/folder-id');
      }

      // decide whether insertion would be before or after based on cursor position
      // but use the entire folder container (header + notes) so we don't allow inserting between header and its notes
      const containerRect = container.getBoundingClientRect();
      const headerRect = folderHeader.getBoundingClientRect();
      const edgeThreshold = Math.max(8, Math.min(20, headerRect.height / 2));

      const nearTop = e.clientY - containerRect.top <= edgeThreshold;
      const nearBottom = containerRect.bottom - e.clientY <= edgeThreshold;

      const siblings = Array.from(
        folderHeader.parentElement.querySelectorAll('.folder-item, .default-folder')
      );

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
        const draggingEl = document.querySelector(
          '.folder-item.dragging, .default-folder.dragging'
        );
        const targetEl = folderHeader;
        if (
          draggingEl &&
          (draggingEl === targetEl ||
            (String(draggingEl.getAttribute('data-folder-id')) === sourceId &&
              String(targetEl.getAttribute('data-folder-id')) === sourceId))
        ) {
          // cleanup and ignore
          folderHeader.classList.remove('drag-over', 'insert-before', 'insert-after');
          return;
        }

        if (sourceId !== targetId) {
          // Determine whether to insert before or after based on mouse position relative to the whole container
          const containerRect = container.getBoundingClientRect();
          const headerRect = folderHeader.getBoundingClientRect();
          const edgeThreshold = Math.max(8, Math.min(20, headerRect.height / 2));
          const nearTop = e.clientY - containerRect.top <= edgeThreshold;
          const nearBottom = containerRect.bottom - e.clientY <= edgeThreshold;

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
        this.moveNoteToFolder(noteId, folder.id);
      }
    });

    return container;
  }

  async moveNoteToFolder(noteId, folderId) {
    const note = this.notes.find((n) => n.id === noteId);
    if (!note) return;

    const oldFolderId = note.folderId || null;
    const targetFolderId = folderId || null;
    // No-op if nothing changed
    if (oldFolderId === targetFolderId) return;

    note.folderId = targetFolderId;
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
      if (oldFolderId) this.updateFolderCountInDOM(oldFolderId);
      if (folderId) this.updateFolderCountInDOM(folderId);

      // Insert into destination if it should be visible under current filter/search
      if (folderId) {
        const folderContainer = document.querySelector(
          `.folder-notes-container[data-folder-id="${folderId}"]`
        );
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
            const newEl = this.createNoteItem(note, true);
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
          visible = !note.folderId;
        }
        if (searchTerm) visible = visible && this.noteMatchesSearch(note, searchTerm);

        if (visible && this.notesList) {
          const newEl = this.createNoteItem(note);
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

    const folderName = !folderId
      ? i18n.t('nav.notes')
      : this.folders.find((f) => f.id === folderId)?.name || i18n.t('messages.unknownFolder');
    const noteTitle = note.title || i18n.t('messages.untitledNote');
    this.showNotification(
      i18n.t('messages.noteMovedToFolder', { title: noteTitle, folder: folderName }),
      'success'
    );
  }

  updateSpecificFolder(folderId) {
    const folderContainer = document.querySelector(
      `.folder-notes-container[data-folder-id="${folderId}"]`
    );
    if (!folderContainer) return;

    this.discardDetachedMenus();
    folderContainer.innerHTML = '';
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

    // Apply search filter to folder notes (use normalized search helper)
    const rawSearchLocal = this.searchInput ? String(this.searchInput.value) : '';
    const searchTermLocal = this.normalizeForSearch(rawSearchLocal);
    if (searchTermLocal) {
      folderNotes = folderNotes.filter((note) => this.noteMatchesSearch(note, searchTermLocal));
    }

    const sortedFolderNotes = this.getSortedNotes(folderNotes);
    sortedFolderNotes.forEach((note) => {
      const noteElement = this.createNoteItem(note, true);
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

    const folder = this.folders.find((f) => f.id === this.selectedFolderId);
    if (!folder) return;

    // Count notes that truly belong to this folder. Folderless notes have a null folderId.
    const notesInFolder = this.notes.filter(
      (note) => note.folderId && String(note.folderId) === String(this.selectedFolderId)
    );
    const noteCount = notesInFolder.length;

    const message =
      noteCount > 0
        ? `"${folder.name}" ${i18n.t('messages.confirmDeleteFolderWithNotes').replace('{count}', noteCount)}`
        : `"${folder.name}" ${i18n.t('messages.confirmDeleteFolder')}`;

    this.confirmMessage.textContent = message;

    // Store folderId locally before hiding context menu
    const folderIdToDelete = this.selectedFolderId;

    this.confirmCallback = () => {
      // Delete all notes that truly belong to the folder (ignore folderless notes)
      const notesToRemove = this.notes
        .filter((note) => note.folderId && String(note.folderId) === String(folderIdToDelete))
        .map((n) => n.id);

      // Keep notes that are NOT in the selected folder (preserve folderless notes and other folders)
      this.notes = this.notes.filter(
        (note) => !(note.folderId && String(note.folderId) === String(folderIdToDelete))
      );

      // Delete the folder
      this.folders = this.folders.filter((f) => f.id !== folderIdToDelete);

      this.removeNoteReferences(notesToRemove);

      // Save and update
      this.saveNotes();
      this.saveFolders();
      this.updateFoldersList();
      this.updateStats();
      if (this.currentFilter === 'favorites') this.updateNotesList();

      // Clear selection if current note was in deleted folder
      if (this.currentNote && this.currentNote.folderId === folderIdToDelete) {
        this.currentNote = null;
        this.showWelcome();
      }

      this.showNotification(i18n.t('messages.folderDeleted', { name: folder.name }), 'success');
    };

    this.hideContextMenu();
    this.showModal(this.confirmModal);
  }

  openFolderColorModal() {
    if (!this.selectedFolderId) return;
    const folder = this.folders.find((f) => f.id === this.selectedFolderId);
    if (!folder) return;
    // Prefill modal input with current folder color
    if (this.folderColorInput) this.folderColorInput.value = folder.color || '#3B82F6';
    // Remember the target folder; the context menu clears selectedFolderId when it closes
    this.colorModalFolderId = folder.id;
    this.showModal(this.folderColorModal);
  }

  applySelectedFolderColor(color) {
    const folderId = this.colorModalFolderId || this.selectedFolderId;
    if (!folderId) return;
    const folder = this.folders.find((f) => f.id === folderId);
    if (!folder) return;
    folder.color = color;
    // Persist the color change
    this.saveFolders();
    // Update only the folder header icon in the DOM to avoid re-rendering the entire notes list
    this.updateFolderColorInDOM(folderId, color);
    this.showNotification(i18n.t('messages.folderColorUpdated'), 'success');
    this.colorModalFolderId = null;
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
