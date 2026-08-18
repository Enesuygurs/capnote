// Formatting toolbar: fonts, colors, styles and alignment

export class EditorFormattingFeature {
  setupFormattingToolbar() {
    // Text color with debounce for performance
    let colorDebounceTimer;
    this.textColor.addEventListener('input', (e) => {
      clearTimeout(colorDebounceTimer);
      colorDebounceTimer = setTimeout(() => {
        this.applyFormat('color', e.target.value);
      }, 50);
    });

    // Also apply on change (when picker is closed/committed)
    this.textColor.addEventListener('change', (e) => {
      clearTimeout(colorDebounceTimer);
      this.applyFormat('color', e.target.value);
    });

    // Background color with debounce for performance
    let bgColorDebounceTimer;
    this.bgColor.addEventListener('input', (e) => {
      clearTimeout(bgColorDebounceTimer);
      bgColorDebounceTimer = setTimeout(() => {
        this.applyFormat('backgroundColor', e.target.value);
      }, 50);
    });

    // Also apply on change (when picker is closed/committed)
    this.bgColor.addEventListener('change', (e) => {
      clearTimeout(bgColorDebounceTimer);
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

    // Emoji panel toggle
    if (this.openEmojiBtn)
      this.openEmojiBtn.addEventListener('click', (e) => this.toggleEmojiPanel());
    // Browse image button opens hidden file input
    if (this.browseImageBtn && this.browseImageInput) {
      this.browseImageBtn.addEventListener('click', () => this.browseImageInput.click());
      this.browseImageInput.addEventListener('change', async (e) => {
        const files = e.target.files || [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          try {
            const saved = await window.electronAPI.saveDroppedFile(f);
            if (!saved) continue;
            this.insertImageAtSelection(saved, f.name);
            this.trackContentChanges();
          } catch (err) {
            console.error('Failed to save browsed image', err);
          }
        }
        // reset input so same file can be selected again
        e.target.value = '';
      });
    }

    // Reminder event listeners
    if (this.remindersNav) {
      this.remindersNav.addEventListener('click', () => this.showRemindersScreen());
    }
    if (this.setReminderBtn) {
      this.setReminderBtn.addEventListener('click', () => this.addReminder());
    }

    // Todos event listeners
    if (this.todosNav) {
      this.todosNav.addEventListener('click', () => this.showTodosScreen());
    }
    if (this.addTodoSectionBtn) {
      this.addTodoSectionBtn.addEventListener('click', () => this.addTodoSection());
    }
    if (this.todoSectionInput) {
      this.todoSectionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && this.todoSectionInput.value.trim()) {
          this.addTodoSection();
        }
      });
    }

    // Notifications event listeners
    if (this.notificationsNav) {
      this.notificationsNav.addEventListener('click', () => this.showNotificationsScreen());
    }

    // Mark all as read button
    if (this.markAllReadBtn) {
      this.markAllReadBtn.addEventListener('click', () => this.markAllNotificationsRead());
    }

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
        // Use modern approach for background color for better reliability
        this.applyBackgroundColor(value);
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

  applyBackgroundColor(colorValue) {
    // Ensure editor has focus and selection is restored
    if (!this.richEditor) return;

    this.richEditor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // If nothing is selected, do nothing (don't apply to whole editor)
    if (range.collapsed) return;

    // Check if selection contains any input elements (like checkboxes)
    const fragment = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);

    // Don't apply if there are any input elements (checkboxes)
    if (tempDiv.querySelector('input')) {
      // Selection contains input/checkbox, abort
      selection.removeAllRanges();
      return;
    }

    try {
      // Create a span with background color
      const span = document.createElement('span');
      span.style.backgroundColor = colorValue;

      // Extract selected contents
      const contents = range.extractContents();

      // If contents is empty, don't apply
      if (!contents.textContent.trim() && !contents.querySelector('img, br')) {
        return;
      }

      // Wrap contents in span
      span.appendChild(contents);
      range.insertNode(span);

      // Restore selection on the new span
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.addRange(newRange);

      // Mark as changed
      this.trackContentChanges();
    } catch (e) {
      console.warn('Background color application failed:', e);
      // Don't use fallback for checkboxes - it will also break them
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
    } catch (e) {
      console.warn('Error updating format panel:', e);
    }
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

  areFormattingsEqual(a = {}, b = {}) {
    return (
      (a.fontFamily || '') === (b.fontFamily || '') && (a.fontSize || '') === (b.fontSize || '')
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
          if (dropdownId === 'fontFamily') {
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
}
