// Editor state: loading a note, change tracking, autosave, mood/weather and tags

import { i18n } from '../i18n.js';

export class EditorFeature {
  clearEditor() {
    this.noteTitle.value = '';
    this.richEditor.innerHTML = '';
    if (this.markdownEditor) this.markdownEditor.value = '';
    // clear the preview
    if (this.markdownPreview) this.hideMarkdownPreview();
    // A preview left open by the previous note hid the text area: show it again
    this.showRichEditor();
    this.clearSavedSelection();
    this.clearMoodWeatherSelection();
    this.clearTags();
    this.updateWordCount();
    // Nothing of the previous note stays: its toolbar state, a half-typed tag, its reminders
    this.resetToolbarState();
    if (this.tagInput) this.tagInput.value = '';
    this.updateNoteRemindersDisplay();
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

  // The note's word and character counts (stored with it; the viewer's strip shows them)
  updateWordCount() {
    // A Markdown note (or a file note) is counted from its text editor; a rich one from the rich
    // editor, whose innerText keeps the visible line breaks
    const source = this.isMarkdownEditing()
      ? this.markdownEditor.value
      : this.richEditor.innerText || this.richEditor.textContent || '';
    const text = source.replace(/\u00A0/g, ' ');
    const words = this.countWords(text);
    const chars = text.length;
    if (this.currentNote) {
      this.currentNote.wordCount = words;
      this.currentNote.charCount = chars;
    }
  }

  loadNoteInEditor(note) {
    this.clearSavedSelection();
    this.renderNoteFiles(note);
    this.noteTitle.value = note.title;
    // Load either raw markdown or HTML depending on note.isMarkdown. A .md file is written as it
    // reads: its Markdown becomes the rich text of the editor (and goes back to Markdown on saving)
    if (this.isLiveMarkdown(note)) {
      // (the line breaks the parser leaves between blocks would show as empty lines)
      this.richEditor.innerHTML = this.markdownToNoteHtml(note.content || '').replace(
        />\s*\n\s*</g,
        '><'
      );
      this.upgradeImagesInEditor();
      this.prepareNoteLinks();
      if (this.markdownEditor) this.markdownEditor.value = '';
      // What the editor holds before any typing: unchanged, the file's own text is kept as it is
      this.liveBaseline = this.richEditor.innerHTML;
    } else if (note.isMarkdown) {
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
      this.prepareNoteLinks();
      if (this.markdownEditor) this.markdownEditor.value = '';
    }
    // The toolbar and the tag field start clean; the toolbar follows the caret from here
    this.resetToolbarState();
    if (this.tagInput) this.tagInput.value = '';

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
    // A file note is edited as the file's text, as its format is: no sidebar; a plain text file has
    // no toolbar, a .md file the toolbar of its Markdown
    this.noteEditor?.classList.toggle('is-file-note', !!note.filePath);
    // Its title is the file's name: it is not changed here (the file would not follow)
    this.noteTitle.readOnly = !!note.filePath;
    // A file's text has no hint while it is empty; a Markdown note keeps "Write Markdown"
    if (this.markdownEditor) {
      this.markdownEditor.placeholder = note.filePath ? '' : i18n.t('placeholders.markdown');
    }
    // Written in Markdown: a .md file, or a Markdown note (a .txt or .html file is edited as text too,
    // but is not Markdown)
    this.noteEditor?.classList.toggle(
      'is-markdown-note',
      !!note.isMarkdown && (!note.filePath || note.fileKind === 'md')
    );
    if (this.noteEditor)
      this.noteEditor.dataset.fileKind = note.filePath ? note.fileKind || '' : '';
    this.applyEditorSidebar(note);
    // Its focus mode button is hidden, so it does not stay in focus mode either
    if (note.filePath && this.isFocusMode?.()) this.setFocusMode(false);
    // The preview starts closed
    this.hideMarkdownPreview();
    // Show appropriate editor (markdownEditor for markdown notes)
    if (note.isMarkdown && !this.isLiveMarkdown(note)) {
      this.showMarkdownEditor();
    } else {
      this.showRichEditor();
    }
    // Undo starts from the note as it was opened
    this.resetEditorHistory?.();
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
    // Every change made by a tool is an undo step
    this.recordEditorHistory?.('step');
    const currentContent = this.getCurrentNoteContent();
    this.currentNoteContent = currentContent;
    this.updateSaveButtonState();
    this.scheduleAutoSave?.();
  }

  // A .md file note: edited as rich text that is written back as the file's Markdown
  isLiveMarkdown(note = this.currentNote) {
    return !!note?.filePath && note.fileKind === 'md';
  }

  // The open note's text as it is saved: the Markdown editor's text, the rich editor's HTML, or for
  // a .md file the rich text as Markdown (the file's own text while nothing was changed, so opening
  // a file does not reformat it)
  editorContent() {
    if (this.isLiveMarkdown()) {
      if (this.richEditor.innerHTML === this.liveBaseline) return this.currentNote.content || '';
      return this.htmlToMarkdown(this.richEditor.innerHTML);
    }
    return this.isMarkdownEditing() ? this.markdownEditor.value : this.richEditor.innerHTML;
  }

  // Whether the open note is edited as markdown (its preview can hide the markdown editor)
  isMarkdownEditing() {
    if (!this.markdownEditor) return false;
    if (this.isLiveMarkdown()) return false;
    return !!this.currentNote?.isMarkdown || !this.markdownEditor.classList.contains('hidden');
  }

  getCurrentNoteContent() {
    // Sync checkbox states to HTML before saving
    this.syncCheckboxStates();

    return {
      title: this.noteTitle.value.trim(),
      content: this.editorContent(),
      mood: this.selectedMood,
      weather: this.selectedWeather,
      tags: this.tags,
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

  // Notes save themselves as they are written: there is no Save button to keep up to date (the
  // callers stay, for what may show the state later)
  updateSaveButtonState() {}

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
      JSON.stringify(currentTags) !== JSON.stringify(originalTags)
    );
  }

  // Whether the body of the note being edited has something in it: text, or an image, a table, a
  // rule, a task, code or an embed
  noteBodyHasContent() {
    const body = this.parseInertHtml(this.getCurrentNoteContent().content || '');
    return (
      !!body.textContent.replace(/\u200B/g, '').trim() ||
      !!body.querySelector('img, table, hr, input, pre, iframe')
    );
  }

  isCurrentNoteEmpty() {
    const content = this.getCurrentNoteContent();
    const hasTitle = content.title && content.title.trim();
    const hasContent = this.noteBodyHasContent();
    const hasMood = content.mood;
    const hasWeather = content.weather;
    const hasTags = content.tags && content.tags.length > 0;
    const hasFiles = this.noteFiles(this.currentNote).length > 0;

    return !hasTitle && !hasContent && !hasMood && !hasWeather && !hasTags && !hasFiles;
  }

  markAsSaved() {
    this.lastSavedContent = this.getCurrentNoteContent();
    this.isAutoSaved = true;
    this.updateSaveButtonState();
  }

  // The app is quitting (or installing an update): what the editor holds is saved now, without
  // waiting for the automatic save
  async saveBeforeQuit() {
    this.cancelAutoSave?.();
    if (this.currentNote && this.isEditorOpen() && !this.isCurrentNoteEmpty()) {
      if (this.hasUnsavedChanges()) this.saveNote(true);
    }
    await this.saveNotes();
  }

  setupAutoSave() {
    window.electronAPI?.onSaveBeforeQuit?.(() => this.saveBeforeQuit());
    let autoSaveTimer;

    this.scheduleAutoSave = () => {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        if (this.currentNote && this.isEditorOpen() && this.hasUnsavedChanges()) {
          this.saveNote(true); // Silent save
        }
      }, 2000);
    };

    this.cancelAutoSave = () => clearTimeout(autoSaveTimer);

    this.richEditor.addEventListener('input', this.scheduleAutoSave);
    this.noteTitle.addEventListener('input', this.scheduleAutoSave);
  }

  setupMoodWeatherSelectors() {
    this.moodBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.selectMood(e.currentTarget.dataset.mood);
        this.trackContentChanges(); // Track changes for save button
      });
    });

    this.weatherBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.selectWeather(e.currentTarget.dataset.weather);
        this.trackContentChanges(); // Track changes for save button
      });
    });
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

  // The editor button for a mood or weather key; it carries the icon and the translated name
  findMoodButton(key) {
    return key ? [...this.moodBtns].find((btn) => btn.dataset.mood === key) : undefined;
  }

  findWeatherButton(key) {
    return key ? [...this.weatherBtns].find((btn) => btn.dataset.weather === key) : undefined;
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
    const lower = String(tagText || '').toLocaleLowerCase(this.getLocale());
    if (!tagText || this.tags.some((t) => t.toLocaleLowerCase(this.getLocale()) === lower)) return;

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
      tagElement.className = 'chip tag';
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

  isSelectionInsideEditor(node) {
    if (!this.richEditor || !node) return false;
    return this.richEditor.contains(node);
  }

  // Nothing written in the editor: empty, or one empty line (what stays after deleting
  // everything). The placeholder shows then, on that line.
  isEditorBlank() {
    const ed = this.richEditor;
    if (!ed.firstChild) return true;
    if (ed.childNodes.length !== 1 || ed.textContent.trim()) return false;
    const only = ed.firstChild;
    return (
      only.nodeType === Node.ELEMENT_NODE &&
      (only.tagName === 'P' || only.tagName === 'DIV') &&
      !only.className &&
      !only.querySelector(':not(br)')
    );
  }

  // Typing, selection tracking, the title field and tags
  setupEditorEvents() {
    // Rich editor events
    this.richEditor.addEventListener('input', () => {
      this.updateWordCount();
      this.trackContentChanges();
    });

    // The placeholder follows every change of the text: typing, loading a note, the tools
    const markBlank = () => this.richEditor.classList.toggle('is-blank', this.isEditorBlank());
    new MutationObserver(markBlank).observe(this.richEditor, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    markBlank();

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
      this.showTitleInList();
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
