// Read-only note view, its checkboxes, code copy buttons and the history dialog

import { i18n } from '../i18n.js';

export class ViewerFeature {
  displayNote(note) {
    this.viewerTitle.textContent = note.title;

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
  }

  displayViewerTags(tags) {
    this.viewerTags.innerHTML = '';
    tags.forEach((tag) => {
      const tagElement = document.createElement('span');
      tagElement.className = 'viewer-tag';
      tagElement.textContent = tag;
      this.viewerTags.appendChild(tagElement);
    });
  }

  openNoteHistory() {
    if (!this.currentNote || this.isNoteLockedForView(this.currentNote)) return;
    const hist = this.currentNote.history || [];
    this.historyBody.innerHTML = '';

    // Show createdAt at the top
    const created = this.currentNote.createdAt ? new Date(this.currentNote.createdAt) : null;
    const locale = this.getLocale();
    if (created) {
      const el = document.createElement('div');
      el.className = 'history-entry created';
      el.innerHTML = `<strong>${i18n.t('viewer.created')}</strong> ${created.toLocaleString(locale)}`;
      this.historyBody.appendChild(el);
    }

    // Render only non-created history entries (created is shown above)
    const updates = hist.filter((h) => h.type !== 'created').reverse();
    if (updates.length > 0) {
      const list = document.createElement('div');
      list.className = 'history-list';
      updates.forEach((h) => {
        const d = new Date(h.ts);
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<span class="history-type">${i18n.t('viewer.updated')}</span> <span class="history-ts">${d.toLocaleString(locale)}</span>`;
        list.appendChild(item);
      });
      this.historyBody.appendChild(list);
    } else {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = i18n.t('viewer.noHistory');
      this.historyBody.appendChild(empty);
    }

    this.showModal(this.noteHistoryModal);
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

    // History modal close handlers
    this.closeHistoryModal?.addEventListener('click', () => this.hideModal(this.noteHistoryModal));

    this.historyCloseBtn?.addEventListener('click', () => this.hideModal(this.noteHistoryModal));
  }
}
