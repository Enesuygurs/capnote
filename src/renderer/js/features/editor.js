// Editor state: loading a note, change tracking, autosave, mood/weather and tags

import { i18n } from '../i18n.js';

export class EditorFeature {
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
      const locale = this.getLocale();
      this.noteDate.textContent = now.toLocaleDateString(locale, {
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
    let text =
      this.richEditor && this.richEditor.innerText
        ? this.richEditor.innerText
        : this.richEditor.textContent || '';
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
      this.wordCount.textContent = `${words} ${i18n.t('stats.words')}`;
    }
    if (this.charCount) {
      this.charCount.textContent = `${chars} ${i18n.t('stats.characters')}`;
    }

    // Editor-side reading time estimate (baseline 200 WPM)
    const WPM = 200;
    const seconds = words ? Math.ceil((words / WPM) * 60) : 0;
    if (this.editorReadingTime) {
      if (!seconds) this.editorReadingTime.textContent = `0 ${i18n.t('stats.readingTime')}`;
      else if (seconds < 60)
        this.editorReadingTime.textContent = `~${seconds} ${i18n.t('stats.readingTimeSeconds')}`;
      else
        this.editorReadingTime.textContent = `~${Math.round(seconds / 60)} ${i18n.t('stats.readingTime')}`;
    }

    if (this.currentNote) {
      this.currentNote.wordCount = words;
      this.currentNote.charCount = chars;
    }
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
      this.richEditor.innerHTML = this.sanitizeHtml(note.content);
      // Copy buttons are viewer UI and must not end up in edited content
      this.richEditor.querySelectorAll('.code-copy-btn').forEach((btn) => btn.remove());
      // ensure any images in loaded content are wrapped and wired for resizing
      this.upgradeImagesInEditor();
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
    this.updateNoteRemindersDisplay();

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
    // Mirror each live checked state into the attribute so it is part of the saved HTML.
    // Toggling the attribute keeps the elements (and the caret) in place, unlike rebuilding them.
    this.richEditor.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      if (checkbox.checked) checkbox.setAttribute('checked', 'checked');
      else checkbox.removeAttribute('checked');
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

  setupAutoSave() {
    let autoSaveTimer;

    this.scheduleAutoSave = () => {
      // Check if auto-save is enabled
      if (!this.settings.autoSave) return;

      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        if (this.currentNote && this.noteEditor && !this.noteEditor.classList.contains('hidden')) {
          this.saveNote(true); // Silent save
        }
      }, 2000);
    };

    this.richEditor.addEventListener('input', this.scheduleAutoSave);
    this.noteTitle.addEventListener('input', this.scheduleAutoSave);
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

    // Emoji panel handlers: search and populate grid
    if (this.emojiSearchInput)
      this.emojiSearchInput.addEventListener('input', (e) => this.filterEmojiGrid(e.target.value));
    // initialize tabs then populate grid
    this.initEmojiTabs();
    this.populateEmojiGrid();
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

  // Tags methods
  addTag(tagText) {
    if (!tagText || this.tags.includes(tagText)) return;

    // At most 5 tags per note
    if (this.tags.length >= 5) {
      this.showNotification(i18n.t('messages.maxTags'), 'warning');
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
      tagElement.textContent = tag;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'tag-remove';
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.addEventListener('click', () => this.removeTag(tag));
      tagElement.appendChild(removeBtn);
      this.tagsList.appendChild(tagElement);
    });
  }

  clearTags() {
    this.tags = [];
    this.updateTagsDisplay();
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
    const range = this.savedSelection.cloneRange
      ? this.savedSelection.cloneRange()
      : this.savedSelection;
    selection.addRange(range);
  }

  clearSavedSelection() {
    this.savedSelection = null;
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

  // Typing, selection tracking, the title field and tags
  setupEditorEvents() {
    // Rich editor events
    this.richEditor.addEventListener('input', () => {
      this.updateWordCount();
      this.trackContentChanges();
    });

    // Track selection for formatter usage
    this.richEditor.addEventListener('mouseup', () => this.captureEditorSelection());

    this.richEditor.addEventListener('keyup', () => this.captureEditorSelection());

    this.richEditor.addEventListener('mouseup', () => this.updateFormatPanelFromSelection());

    this.richEditor.addEventListener('keyup', () => this.updateFormatPanelFromSelection());

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

    this.noteTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.richEditor.focus();
      }
    });

    // Tags
    this.tagInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addTag(e.target.value.trim());
        e.target.value = '';
      }
    });
  }
}
