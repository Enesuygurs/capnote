// Read-only note view, its checkboxes, code copy buttons and the history dialog

import { i18n } from '../i18n.js';

export class ViewerFeature {
  displayNote(note) {
    // Showing a note (another one, or this one again) ends a version preview
    if (!note.isVersionPreview) this.clearVersionPreview();
    this.viewerTitle.textContent = this.displayTitle(note);
    this.updateArchiveView?.();

    // Check if note is locked and not temporarily unlocked
    if (this.isNoteLockedForView(note)) {
      this.viewerText.innerHTML = `
                <div class="empty-state empty-state-large">
                    <i class="fas fa-lock"></i>
                    <h3>${i18n.t('messages.noteIsLocked')}</h3>
                    <p>${i18n.t('messages.unlockFromList')}</p>
                </div>
            `;
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
    }
    this.renderBacklinks(note);

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

    // Mood and weather
    this.showMoodWeatherIcon(this.viewerMood, this.findMoodButton(note.mood));
    this.showMoodWeatherIcon(this.viewerWeather, this.findWeatherButton(note.weather));

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

  // A version's text in one line, for the history list
  versionSnippet(version) {
    const text = version.isMarkdown
      ? String(version.content || '').replace(/[#>*_`~[\]()-]+/g, ' ')
      : this.getPlainText(version.content || '');
    return text.replace(/\s+/g, ' ').trim();
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
  // version (the note as it was before an edit, saved at the time of the edit before it) with a
  // line of its text and a way to view it, then the note's creation
  openNoteHistory() {
    const note = this.versionPreview?.note || this.currentNote;
    if (!note || this.isNoteLockedForView(note)) return;
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
    // An entry's version was saved by the edit before it (the first one at creation)
    const earlier = updates.map((h, i) => {
      const savedAt = i > 0 ? updates[i - 1].ts : note.createdAt;
      let action;
      if (h.version) {
        action = document.createElement('button');
        action.type = 'button';
        action.className = 'btn-secondary btn-small history-view';
        action.innerHTML = '<i class="fas fa-eye"></i> <span></span>';
        action.querySelector('span').textContent = i18n.t('history.view');
        action.addEventListener('click', () => this.previewNoteVersion(note, h.version, savedAt));
      } else {
        action = document.createElement('span');
        action.className = 'history-no-version';
        action.textContent = i18n.t('history.noVersion');
      }
      const el = row({
        kind: h.version ? 'version' : 'gone',
        title: this.historyDate(savedAt),
        text: h.version ? this.versionSnippet(h.version) || words('') : '',
        action,
      });
      if (h.version) el.title = h.version.title || i18n.t('messages.untitledNote');
      return el;
    });
    earlier.reverse().forEach((el) => timeline.appendChild(el));
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
    if (!updates.length) {
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
  // says which version it is and offers the list, the current version and a restore
  previewNoteVersion(note, version, savedAt) {
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

  // Note history dialog
  setupViewerEvents() {
    // History button opens history modal (instead of clicking date)
    this.historyBtn = document.getElementById('historyBtn');

    this.historyBtn?.addEventListener('click', () => this.openNoteHistory());
    this.versionListBtn?.addEventListener('click', () => this.openNoteHistory());
    this.versionCloseBtn?.addEventListener('click', () => this.endVersionPreview());
    this.versionRestoreBtn?.addEventListener('click', () => this.restorePreviewedVersion());

    // History modal close handlers
    this.closeHistoryModal?.addEventListener('click', () => this.hideModal(this.noteHistoryModal));

    this.historyCloseBtn?.addEventListener('click', () => this.hideModal(this.noteHistoryModal));
  }
}
