// Folders: create, rename, color, reorder, delete and moving notes between them

import { i18n } from '../i18n.js';

export class FoldersFeature {
  showFolderModal() {
    this._renamingFolderId = null;
    // Ensure modal title/button show create mode
    const titleEl = this.folderModal.querySelector('.modal-title h3');
    const createBtn = document.getElementById('createFolderBtn');
    if (titleEl) titleEl.textContent = i18n.t('messages.newFolder');
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
    const createBtn = document.getElementById('createFolderBtn');
    if (titleEl) titleEl.textContent = i18n.t('messages.renameFolder');
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
    // Renaming a folder to another capitalisation of its own name is allowed
    if (
      this.folders.some(
        (folder) =>
          folder.id !== this._renamingFolderId && folder.name.toLowerCase() === name.toLowerCase()
      )
    ) {
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

  // True while a folder (not a note) is being dragged; folder drags carry 'text/folder-id'.
  // Reading drag data during dragover can throw, so the type list is checked first.
  isDraggingFolder(e) {
    const types = e.dataTransfer && e.dataTransfer.types ? Array.from(e.dataTransfer.types) : [];
    if (types.includes('text/folder-id')) return true;
    try {
      return Boolean(e.dataTransfer.getData && e.dataTransfer.getData('text/folder-id'));
    } catch {
      return false;
    }
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

    // Vivid, mid-light colors that read on both themes: no dark or washed-out shades
    const colors = [
      '#3B82F6', // blue
      '#0EA5E9', // sky
      '#06B6D4', // cyan
      '#14B8A6', // teal
      '#22C55E', // green
      '#84CC16', // lime
      '#EAB308', // yellow
      '#F59E0B', // amber
      '#F97316', // orange
      '#EF4444', // red
      '#F43F5E', // rose
      '#EC4899', // pink
      '#D946EF', // fuchsia
      '#A855F7', // purple
      '#8B5CF6', // violet
      '#6366F1', // indigo
    ];
    // Prefer a color no other folder has yet
    const used = new Set(this.folders.map((f) => String(f.color || '').toUpperCase()));
    const free = colors.filter((c) => !used.has(c));
    const pool = free.length ? free : colors;
    return pool[Math.floor(Math.random() * pool.length)];
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
    const treatAsFilter = this.isViewFiltered();

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
    const treatAsFilter = this.isViewFiltered();
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
  // Notes of a folder that are visible now; a folder whose name matches the search shows all of them
  visibleFolderNotes(folderId) {
    const searchTerm = this.currentSearchTerm();
    const folder = this.folders.find((f) => f.id === folderId);
    const nameMatches =
      !!searchTerm && !!folder && this.normalizeForSearch(folder.name).includes(searchTerm);
    return this.notes.filter(
      (note) =>
        note.folderId === folderId && this.matchesCurrentView(note, nameMatches ? '' : searchTerm)
    );
  }

  getVisibleCountForFolder(folderId) {
    return this.visibleFolderNotes(folderId).length;
  }

  // Fill a folder's notes container and hide the folder when filtering leaves it empty
  renderFolderNotes(container) {
    const folderId = container.getAttribute('data-folder-id');
    container.innerHTML = '';
    const notes = this.getSortedNotes(this.visibleFolderNotes(folderId));
    notes.forEach((note) => container.appendChild(this.createNoteItem(note, true)));
    const wrapper = container.closest('.folder-container');
    if (wrapper) wrapper.style.display = this.isViewFiltered() && notes.length === 0 ? 'none' : '';
  }

  createFolderElement(folder) {
    const container = document.createElement('div');
    container.className = 'folder-container';

    const folderHeader = document.createElement('div');
    folderHeader.className = 'nav-item folder-item nav-expandable expanded';
    folderHeader.setAttribute('data-folder-id', folder.id);

    // The same count the badge shows after a move: the notes visible under the filter
    const noteCount = this.getVisibleCountForFolder(folder.id);

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
      const isFolderDrag = this.isDraggingFolder(e);

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

          // A drop away from the top and bottom edges is not an insertion
          if (!nearTop && !nearBottom) {
            folderHeader.classList.remove('drag-over', 'insert-before', 'insert-after');
            return;
          }
          const insertBefore = nearTop;

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
    // Its custom place belonged to the other list; it starts at the top of the new one
    delete note.order;

    try {
      await this.saveNotes();

      this.updateNotesList();
      this.updateFoldersList();
    } catch (error) {
      console.error('Moving the note failed:', error);
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
    const container = document.querySelector(
      `.folder-notes-container[data-folder-id="${folderId}"]`
    );
    if (container) this.renderFolderNotes(container);
  }

  // Context menu functions
  showFolderContextMenu(x, y, folderId) {
    this.hideNoteContextMenu();
    this.selectedFolderId = folderId;
    this.positionMenu(this.contextMenu, x, y);
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
      this.updateNotesList();
      this.updateStats();

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

  // Folder dialogs, the folder context menu and dropping notes back to the root list
  setupFolderEvents() {
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

    // Taking a note out of its folder: drop it anywhere in the sidebar list outside the folders.
    // Only a note that is in a folder can be dropped there; the root list shows where it goes.
    const notesListContainer = document.getElementById('notesListContainer');
    const area = this.sidebarContent;
    if (notesListContainer && area) {
      const draggedFolderNote = (e) => {
        if (this.isDraggingFolder(e) || e.target.closest('.folder-container')) return null;
        const note = this.notes.find((n) => n.id === this.draggedNoteId);
        return note && note.folderId ? note : null;
      };

      area.addEventListener('dragover', (e) => {
        if (!draggedFolderNote(e)) {
          notesListContainer.classList.remove('drag-over');
          return;
        }
        e.preventDefault();
        notesListContainer.dataset.dropLabel = i18n.t('messages.dropOutsideFolders');
        notesListContainer.classList.add('drag-over');
      });

      area.addEventListener('dragleave', (e) => {
        if (!area.contains(e.relatedTarget)) notesListContainer.classList.remove('drag-over');
      });

      area.addEventListener('drop', (e) => {
        notesListContainer.classList.remove('drag-over');
        const note = draggedFolderNote(e);
        if (!note) return;
        e.preventDefault();
        this.moveNoteToFolder(note.id, null);
      });
    }
  }
}
