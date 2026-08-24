// Modals, confirmation dialog, toasts and keyboard shortcuts

export class UiFeature {
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

    // New combined import/export handlers
    if (this.exportAllDataBtn)
      this.exportAllDataBtn.addEventListener('click', () => this.exportAllData());
    if (this.importAllDataBtn)
      this.importAllDataBtn.addEventListener('click', () => this.importAllData());
    // Table modal events
    if (this.insertTableBtn)
      this.insertTableBtn.addEventListener('click', () => this.showModal(this.tableModal));
    if (this.closeTableModal)
      this.closeTableModal.addEventListener('click', () => this.hideModal(this.tableModal));
    if (this.cancelTableBtn)
      this.cancelTableBtn.addEventListener('click', () => this.hideModal(this.tableModal));
    if (this.insertTableConfirmBtn)
      this.insertTableConfirmBtn.addEventListener('click', () => this.handleInsertTable());
    // Clear actions
    this.clearAllNotesBtn?.addEventListener('click', () => this.confirmClearAllNotes());
    this.clearAllFoldersBtn?.addEventListener('click', () => this.confirmClearAllFolders());
    this.clearAllContentBtn?.addEventListener('click', () => this.confirmClearAllContent());

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        // The settings dialog closes without the animation
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
          // The settings dialog closes without the animation
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

        // Disable Enter key in settings modal to prevent accidental button clicks
        if (modal.id === 'settingsModal') {
          return;
        }

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
          '.btn',
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

  // Notification methods
  showNotification(message, type = 'info', meta = {}) {
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

    // If meta.notificationId is provided, attach click handler to mark as read and open notifications
    if (meta && meta.notificationId) {
      this.notification.dataset.notificationId = String(meta.notificationId);
      this.notification.style.cursor = 'pointer';
      // Remove previous handler if any
      if (this._toastClickHandler)
        this.notification.removeEventListener('click', this._toastClickHandler);
      this._toastClickHandler = (e) => {
        const nid = this.notification.dataset.notificationId;
        if (nid) {
          this.markNotificationAsRead(nid);
        }
        this.showNotificationsScreen();
        this.hideNotification();
      };
      this.notification.addEventListener('click', this._toastClickHandler);
    } else {
      this.notification.style.cursor = '';
      if (this._toastClickHandler) {
        this.notification.removeEventListener('click', this._toastClickHandler);
        this._toastClickHandler = null;
      }
    }

    // Auto hide after 3 seconds; restart the timer so an earlier toast cannot hide this one early
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.hideNotification();
    }, 3000);
  }

  hideNotification() {
    this.notification.classList.add('hidden');
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
            // Saving reads from the editor fields, so it is only valid while editing
            if (this.currentNote && this.isEditorOpen()) {
              this.saveNote();
            }
            break;
          case 'f':
            e.preventDefault();
            this.toggleSearch();
            break;
          case 'e':
            e.preventDefault();
            if (this.currentNote && this.isViewerOpen()) {
              this.editCurrentNote();
            }
            break;
          case 'd':
            e.preventDefault();
            if (this.currentNote && this.isViewerOpen()) {
              this.duplicateNote();
            }
            break;
        }
      }

      if (e.key === 'Escape') {
        // Close the top-most thing first; only leave the editor when nothing else is open
        const openModal = document.querySelector('.modal:not(.hidden)');
        if (openModal) {
          if (openModal === this.passwordModal) this.hidePasswordModal();
          else this.hideAllModals();
          return;
        }
        if (this.emojiPanel && !this.emojiPanel.classList.contains('hidden')) {
          this.hideEmojiPanel();
          return;
        }
        if (this.isEditorOpen()) this.cancelEdit();
      }
    });
  }
}
