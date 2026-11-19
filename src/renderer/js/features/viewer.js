// Read-only note view, its checkboxes, code copy buttons and the history dialog

import { i18n } from '../i18n.js';

export class ViewerFeature {
  displayNote(note) {
    // Showing a note (another one, or this one again) ends a version preview
    if (!note.isVersionPreview) this.clearVersionPreview();
    // An open note's own page shows its title (elsewhere a locked one's title may be hidden)
    this.viewerTitle.textContent = this.isNoteLockedForView(note)
      ? this.displayTitle(note)
      : note.title || i18n.t('messages.untitledNote');
    this.updateArchiveView?.();

    // A locked note shows only its lock page: none of the note's actions until it is opened
    this.noteViewer?.classList.toggle('is-locked', this.isNoteLockedForView(note));

    // Check if note is locked and not temporarily unlocked
    if (this.isNoteLockedForView(note)) {
      // The password is asked on the note's own page, under its lock
      this.viewerText.innerHTML = this.lockedNotePageHtml();
      this.wireLockedNotePage(note);
    } else if (note.fileKind && this.fileNoteViewerHtml(note) !== null) {
      // A text or HTML file shows as the file would
      this.viewerText.innerHTML = this.fileNoteViewerHtml(note);
    } else {
      if (note.isMarkdown) {
        try {
          this.viewerText.innerHTML = this.sanitizeHtml(
            window.marked && marked.parse ? marked.parse(note.content || '') : note.content || ''
          );
        } catch (e) {
          this.viewerText.textContent = note.content || '';
        }
      } else {
        this.viewerText.innerHTML = this.sanitizeHtml(note.content);
      }
      // Attach copy buttons to code blocks in the viewer
      this.attachCopyButtonsToPre(this.viewerText);
      // Links to other notes show their current titles
      this.refreshNoteLinks(this.viewerText);
      // Lists with items under them and headings fold (an earlier version keeps no folds)
      this.makeFoldable(this.viewerText, note.isVersionPreview ? null : note.id);
    }
    this.renderBacklinks(note);
    this.renderNoteFiles(note);
    // A file note is its file, not a full note: no copy, history, export or archive
    ['duplicateNoteBtn', 'historyBtn', 'exportNoteBtn', 'archiveViewBtn'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.hidden = this.isFileNote(note);
    });
    // The "more" button only when its menu has something in it
    if (this.viewerMoreBtn) {
      this.viewerMoreBtn.hidden = ![...this.viewerMoreMenu.children].some((item) => !item.hidden);
    }
    // A file note has a "File path" button: its path on hover, a click shows the file in its folder
    if (this.viewerFile) {
      this.viewerFile.classList.toggle('hidden', !note.filePath);
      if (note.filePath) {
        this.viewerFile.querySelector('span').textContent = i18n.t('files.pathButton');
        this.viewerFile.title = `${note.filePath}\n${i18n.t('files.reveal')}`;
        this.viewerFile.querySelector('i').className = this.fileNoteIcon(note);
      }
    }

    this.applyViewerFormatting(note.formatting);

    // Restore checkbox states in viewer
    this.restoreCheckboxStatesInViewer();

    // Save last viewed note
    this.saveLastViewedNote(note.id);

    // Tarih bilgisi
    const createdDate = new Date(note.createdAt);
    const updatedDate = new Date(note.updatedAt);
    const locale = this.getLocale();
    this.viewerDate.textContent = createdDate.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Mood and weather (a locked note shows them only once it is opened)
    const lockedNow = this.isNoteLockedForView(note);
    this.showMoodWeatherIcon(this.viewerMood, lockedNow ? null : this.findMoodButton(note.mood));
    this.showMoodWeatherIcon(
      this.viewerWeather,
      lockedNow ? null : this.findWeatherButton(note.weather)
    );

    // Tags
    this.displayViewerTags(note.tags || []);

    // Stats - compute from HTML content to avoid showing stale stored counts
    const lockedForView = this.isNoteLockedForView(note);
    const counts = lockedForView
      ? { words: note.wordCount || 0, chars: note.charCount || 0 }
      : this.countWordsAndCharsFromHtml(note.content || '');
    if (!lockedForView) {
      // Update in-memory note counts so subsequent actions use the up-to-date value
      note.wordCount = counts.words;
      note.charCount = counts.chars;
    }
    if (this.viewerWordCount)
      this.viewerWordCount.textContent = `${counts.words} ${i18n.t('stats.words')}`;
    if (this.viewerCharCount)
      this.viewerCharCount.textContent = `${counts.chars} ${i18n.t('stats.characters')}`;
    // Reading time calculation (baseline 200 words per minute)
    const WPM = 200;
    if (!counts.words) {
      this.readingTime.textContent = `0 ${i18n.t('stats.readingTime')}`;
    } else {
      const seconds = Math.ceil((counts.words / WPM) * 60);
      if (seconds < 60) {
        this.readingTime.textContent = `~${seconds} ${i18n.t('stats.readingTimeSeconds')}`;
      } else {
        const minutes = Math.round(seconds / 60);
        this.readingTime.textContent = `~${minutes} ${i18n.t('stats.readingTime')}`;
      }
    }
    // Show date + time for last modified (e.g. 12.10.2025 14:35)
    const locale2 = this.getLocale();
    this.lastModified.textContent = updatedDate.toLocaleString(locale2, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    this.updateFavoriteButtons();
  }

  // Shows a copy of an editor button's icon, named by its title; empty when nothing is selected
  showMoodWeatherIcon(target, button) {
    const icon = button?.querySelector('i');
    target.replaceChildren(...(icon ? [icon.cloneNode()] : []));
    target.title = icon ? button.title : '';
    // Carries the key so the icon gets the same color as in the editor
    target.dataset.tone = icon ? button.dataset.mood || button.dataset.weather : '';
  }

  displayViewerTags(tags) {
    this.viewerTags.innerHTML = '';
    tags.forEach((tag) => {
      // A tag opens the tags page with its notes
      const tagElement = document.createElement('button');
      tagElement.type = 'button';
      tagElement.className = 'chip viewer-tag';
      tagElement.textContent = tag;
      this.viewerTags.appendChild(tagElement);
    });
  }

  historyDate(ts) {
    return new Date(ts).toLocaleString(this.getLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // The note's versions as a timeline, the newest first: the current one, then each earlier
  // version (the note as it was before an edit, saved at the time of the edit before it) with its
  // title and a way to view it, then the note's creation
  openNoteHistory() {
    const note = this.versionPreview?.note || this.currentNote;
    // A file note keeps no history
    if (!note || this.isNoteLockedForView(note) || this.isFileNote(note)) return;
    const hist = note.history || [];
    this.historyBody.innerHTML = '';

    const row = ({ kind, when, text, title, action }) => {
      const el = document.createElement('div');
      el.className = `history-row is-${kind}`;
      el.innerHTML =
        '<span class="history-dot"></span><div class="history-text"><span class="history-when"></span><span class="history-snippet"></span></div>';
      el.querySelector('.history-when').textContent = title;
      const snippet = el.querySelector('.history-snippet');
      snippet.textContent = [when, text].filter(Boolean).join(' · ');
      if (action) el.appendChild(action);
      return el;
    };
    const timeline = document.createElement('div');
    timeline.className = 'history-timeline';
    const words = (content) =>
      i18n.t('history.words', { count: this.countWordsAndCharsFromHtml(content || '').words });

    const updates = hist.filter((h) => h.type !== 'created');
    timeline.appendChild(
      row({
        kind: 'current',
        title: i18n.t('history.current'),
        when: this.historyDate(note.updatedAt),
        text: words(note.content),
      })
    );
    // An entry's version was saved by the edit before it (the first one at creation). Entries
    // whose text was not kept (older edits) are left out.
    const earlier = updates
      .map((h, i) => ({ version: h.version, savedAt: i > 0 ? updates[i - 1].ts : note.createdAt }))
      .filter(({ version }) => version);
    earlier.reverse().forEach(({ version, savedAt }) => {
      const view = document.createElement('button');
      view.type = 'button';
      view.className = 'btn-secondary btn-small history-view';
      view.innerHTML = '<i class="fas fa-eye"></i> <span></span>';
      view.querySelector('span').textContent = i18n.t('history.view');
      view.addEventListener('click', () => this.previewNoteVersion(note, version, savedAt));
      // Or straight to what changed since
      const compare = document.createElement('button');
      compare.type = 'button';
      compare.className = 'btn-icon btn-icon-sm history-compare';
      compare.innerHTML = '<i class="fas fa-code-compare"></i>';
      compare.title = i18n.t('history.compare');
      compare.setAttribute('aria-label', i18n.t('history.compare'));
      compare.addEventListener('click', () =>
        this.previewNoteVersion(note, version, savedAt, { diff: true })
      );
      const actions = document.createElement('div');
      actions.className = 'history-actions';
      actions.append(compare, view);
      timeline.appendChild(
        row({
          kind: 'version',
          title: this.historyDate(savedAt),
          text: version.title || i18n.t('messages.untitledNote'),
          action: actions,
        })
      );
    });
    if (note.createdAt) {
      timeline.appendChild(
        row({
          kind: 'created',
          title: i18n.t('viewer.created').replace(/:\s*$/, ''),
          when: this.historyDate(note.createdAt),
        })
      );
    }
    this.historyBody.appendChild(timeline);
    if (!earlier.length) {
      const empty = document.createElement('p');
      empty.className = 'history-empty';
      empty.textContent = i18n.t('viewer.noHistory');
      this.historyBody.appendChild(empty);
    }
    if (note.isLocked) {
      const hint = document.createElement('p');
      hint.className = 'history-empty';
      hint.textContent = i18n.t('history.lockedHint');
      this.historyBody.appendChild(hint);
    }
    if (this.noteHistoryModal.classList.contains('hidden')) this.showModal(this.noteHistoryModal);
  }

  // An earlier version shown in the viewer in place of the note, read-only, under a banner that
  // says which version it is and offers the comparison with now, the list, the current version
  // and a restore (diff: open it as the comparison)
  previewNoteVersion(note, version, savedAt, { diff = false } = {}) {
    this.hideModal(this.noteHistoryModal);
    const preview = {
      ...note,
      title: version.title,
      content: version.content,
      isMarkdown: !!version.isMarkdown,
      updatedAt: savedAt,
      isVersionPreview: true,
    };
    this.versionPreview = { note, version, savedAt };
    if (!this.isViewerOpen()) this.showViewer();
    this.displayNote(preview);
    this.noteViewer.classList.add('is-version-preview');
    this.versionBanner.classList.remove('hidden');
    this.versionBannerDate.textContent = i18n.t('history.versionOf', {
      date: this.historyDate(savedAt),
    });
    this.versionDiffBtn?.classList.remove('active');
    this.versionDiffBtn?.setAttribute('aria-pressed', 'false');
    this.versionDiffSummary?.classList.add('hidden');
    if (diff) this.toggleVersionDiff(true);
  }

  clearVersionPreview() {
    if (!this.versionPreview) return;
    this.versionPreview = null;
    this.noteViewer.classList.remove('is-version-preview');
    this.versionBanner.classList.add('hidden');
  }

  // Back to the note as it is now
  endVersionPreview() {
    const note = this.versionPreview?.note;
    this.clearVersionPreview();
    if (note && this.currentNote === note) this.displayNote(note);
  }

  restorePreviewedVersion() {
    const { note, version } = this.versionPreview || {};
    if (!note) return;
    this.clearVersionPreview();
    this.restoreNoteVersion(note, version);
  }

  // Attach a small copy button to every <pre> inside the given container
  attachCopyButtonsToPre(container) {
    if (!container) return;
    const pres = container.querySelectorAll('pre');
    pres.forEach((pre) => {
      // Older versions could persist copy buttons inside note content; replace them with live ones
      pre.querySelectorAll('.code-copy-btn').forEach((stale) => stale.remove());

      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.type = 'button';
      btn.title = i18n.t('messages.copyCode');
      btn.innerHTML = '<i class="fas fa-copy"></i>';

      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = pre.innerText || pre.textContent || '';
        try {
          await navigator.clipboard.writeText(text);
          btn.classList.add('copied');
          btn.title = i18n.t('messages.copied');
          // show toast
          if (this.showNotification)
            this.showNotification(i18n.t('messages.codeCopied'), 'success');
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.title = i18n.t('messages.copyCode');
          }, 1200);
        } catch (err) {
          // fallback: select and execCommand
          try {
            const range = document.createRange();
            range.selectNodeContents(pre);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('copy');
            sel.removeAllRanges();
            btn.classList.add('copied');
            if (this.showNotification)
              this.showNotification(i18n.t('messages.codeCopied'), 'success');
            setTimeout(() => btn.classList.remove('copied'), 1200);
          } catch (e) {
            console.error('copy failed', e);
            if (this.showNotification)
              this.showNotification(i18n.t('messages.copyFailed'), 'error');
          }
        }
      });

      // Wrap pre in a relative container to position the button if necessary
      pre.style.position = pre.style.position || 'relative';
      pre.appendChild(btn);
    });
  }

  restoreCheckboxStatesInViewer() {
    // Sync checkbox properties from HTML attributes in viewer
    const checkboxes = this.viewerText.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      const shouldBeChecked = checkbox.hasAttribute('checked');

      // Force immediate visual update
      checkbox.checked = shouldBeChecked;

      // Force DOM to re-render by cloning and replacing
      const newCheckbox = checkbox.cloneNode(true);
      newCheckbox.checked = shouldBeChecked;
      if (shouldBeChecked) {
        newCheckbox.setAttribute('checked', 'checked');
      } else {
        newCheckbox.removeAttribute('checked');
      }

      checkbox.parentNode.replaceChild(newCheckbox, checkbox);
    });
  }

  applyViewerFormatting(formatting = {}) {
    if (!this.viewerText) return;
    const applied = { ...this.getDefaultFormatting(), ...(formatting || {}) };
    this.viewerText.style.fontFamily = applied.fontFamily;
    this.viewerText.style.fontSize = applied.fontSize;
  }

  setupCheckboxListeners() {
    // Editor: toggling a checkbox is a regular edit, so mark it dirty and let autosave persist it
    this.richEditor.addEventListener('change', (e) => {
      if (!e.target || e.target.type !== 'checkbox') return;
      this.trackContentChanges();
      this.scheduleAutoSave();
    });

    // Viewer: a click on a task's text ticks its own box (not through the label's id, which the
    // editor's copy of the note can share)
    this.viewerText.addEventListener('click', (e) => {
      const label = e.target.closest?.('.checklist-item > label');
      if (!label || e.target.closest('a')) return;
      e.preventDefault();
      const box = label.parentElement.querySelector(':scope > input[type="checkbox"]');
      if (box && !box.disabled) box.click();
    });

    // Viewer: write only the toggled checkbox state back into the stored content.
    // The viewer DOM itself must never be saved (it contains UI such as copy buttons).
    this.viewerText.addEventListener('change', (e) => {
      if (!e.target || e.target.type !== 'checkbox' || !this.currentNote) return;
      if (this.currentNote.isMarkdown) return;

      const index = Array.from(this.viewerText.querySelectorAll('input[type="checkbox"]')).indexOf(
        e.target
      );
      const doc = new DOMParser().parseFromString(this.currentNote.content || '', 'text/html');
      const stored = doc.body.querySelectorAll('input[type="checkbox"]')[index];
      if (!stored) return;

      if (e.target.checked) stored.setAttribute('checked', 'checked');
      else stored.removeAttribute('checked');

      this.currentNote.content = doc.body.innerHTML;
      this.currentNote.updatedAt = new Date().toISOString();
      this.saveNotes();
      if (this.currentNote.isLocked) this.resealNote(this.currentNote);
    });
  }

  // The menu of the viewer's other actions (copy, history, export, archive)
  // (byKeyboard: its first item takes the focus, as a keyboard user goes on from there)
  toggleViewerMoreMenu(
    open = this.viewerMoreMenu.classList.contains('hidden'),
    byKeyboard = false
  ) {
    const menu = this.viewerMoreMenu;
    if (!open) {
      menu.classList.add('hidden');
      this.viewerMoreBtn.setAttribute('aria-expanded', 'false');
      this.viewerMoreBtn.classList.remove('active');
      return;
    }
    const rect = this.viewerMoreBtn.getBoundingClientRect();
    menu.classList.remove('hidden');
    const width = menu.getBoundingClientRect().width;
    this.positionMenu(menu, rect.right - width, rect.bottom + 4);
    this.viewerMoreBtn.setAttribute('aria-expanded', 'true');
    this.viewerMoreBtn.classList.add('active');
    if (byKeyboard) menu.querySelector('.menu-item:not([hidden])')?.focus();
  }

  setupViewerMoreMenu() {
    this.viewerMoreBtn = document.getElementById('viewerMoreBtn');
    this.viewerMoreMenu = document.getElementById('viewerMoreMenu');
    if (!this.viewerMoreBtn || !this.viewerMoreMenu) return;
    this.viewerMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // A click from the keyboard (Enter, Space) has no pointer position
      this.toggleViewerMoreMenu(undefined, e.detail === 0);
    });
    // A choice closes it (the item's own action runs too)
    this.viewerMoreMenu.addEventListener('click', () => this.toggleViewerMoreMenu(false));
    this.viewerMoreMenu.addEventListener('keydown', (e) => {
      const items = [...this.viewerMoreMenu.querySelectorAll('.menu-item:not([hidden])')];
      const at = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') items[(at + 1) % items.length]?.focus();
      else if (e.key === 'ArrowUp') items[(at - 1 + items.length) % items.length]?.focus();
      else if (e.key === 'Escape') {
        this.toggleViewerMoreMenu(false);
        this.viewerMoreBtn.focus();
      } else return;
      e.preventDefault();
      e.stopPropagation();
    });
    document.addEventListener('mousedown', (e) => {
      if (!e.target.closest?.('.viewer-more')) this.toggleViewerMoreMenu(false);
    });
    window.addEventListener('blur', () => this.toggleViewerMoreMenu(false));
  }

  // Edit the note on screen with the caret at a point of its text (a double-click there). Not on
  // a link, a box, a button or a task's text (a click on it ticks the task); not on an earlier
  // version or a note still locked.
  async editAtPoint(e) {
    const note = this.currentNote;
    if (!note || note.isVersionPreview || this.versionPreview || this.isNoteLockedForView(note)) {
      return;
    }
    if (e.target.closest('a, input, button, img, .checklist-item > label')) return;
    const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    const offset =
      range && this.viewerText.contains(range.startContainer)
        ? this.textOffsetIn(this.viewerText, range)
        : null;
    window.getSelection()?.removeAllRanges();
    await this.editCurrentNote();
    if (offset !== null && this.isEditorOpen() && !this.isMarkdownEditing?.()) {
      this.placeCaretAtTextOffset(this.richEditor, offset);
    }
  }

  // Note history dialog
  setupViewerEvents() {
    // History button opens history modal (instead of clicking date)
    this.historyBtn = document.getElementById('historyBtn');

    this.historyBtn?.addEventListener('click', () => this.openNoteHistory());
    this.setupViewerMoreMenu();

    // A double-click on the note's text opens it for editing, the caret where it was clicked
    this.viewerText.addEventListener('dblclick', (e) => this.editAtPoint(e));
    this.versionDiffBtn?.addEventListener('click', () => this.toggleVersionDiff());
    this.versionListBtn?.addEventListener('click', () => this.openNoteHistory());
    this.versionCloseBtn?.addEventListener('click', () => this.endVersionPreview());
    this.versionRestoreBtn?.addEventListener('click', () => this.restorePreviewedVersion());

    // History modal close handlers
    this.closeHistoryModal?.addEventListener('click', () => this.hideModal(this.noteHistoryModal));

    this.historyCloseBtn?.addEventListener('click', () => this.hideModal(this.noteHistoryModal));
  }
}
