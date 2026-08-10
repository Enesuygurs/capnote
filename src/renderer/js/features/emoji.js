// Emoji panel and emoji keywords

import { EMOJI_SETS, EMOJI_KEYWORDS } from '../data/emoji.js';

export class EmojiFeature {
  toggleEmojiPanel() {
    if (!this.emojiPanel) return;
    if (this.emojiPanel.classList.contains('hidden')) {
      // capture the current editor selection so we can restore it after the panel steals focus
      try {
        this.captureEditorSelection();
      } catch (err) {
        // ignore capture errors
      }
      // Temporarily make visible (but not yet shown) so we can measure size
      this.emojiPanel.classList.remove('hidden');
      // remove show class to keep initial transform/opacity state
      this.emojiPanel.classList.remove('show');

      // allow layout to update
      requestAnimationFrame(() => {
        if (this.openEmojiBtn) {
          const btnRect = this.openEmojiBtn.getBoundingClientRect();
          const panelRect = this.emojiPanel.getBoundingClientRect();
          // compute left so panel centers under button when possible
          let left = Math.round(btnRect.left + btnRect.width / 2 - panelRect.width / 2);
          // clamp to viewport
          const minLeft = 4;
          const maxLeft = window.innerWidth - panelRect.width - 4;
          left = Math.max(minLeft, Math.min(maxLeft, left));
          this.emojiPanel.style.left = left + 'px';
          // flush: top edge slightly below button bottom for breathing room
          const verticalNudge = 10; // px
          this.emojiPanel.style.top = Math.round(btnRect.bottom) + verticalNudge + 'px';
          this.emojiPanel.style.right = 'auto';
        }

        // show with animation
        requestAnimationFrame(() => {
          this.emojiPanel.classList.add('show');
          setTimeout(() => this.emojiSearchInput && this.emojiSearchInput.focus(), 100);
          if (this.openEmojiBtn) this.openEmojiBtn.classList.add('active');
        });
      });
    } else {
      this.emojiPanel.classList.remove('show');
      // wait for animation then hide
      setTimeout(() => this.emojiPanel.classList.add('hidden'), 160);
      if (this.openEmojiBtn) this.openEmojiBtn.classList.remove('active');
    }
  }

  hideEmojiPanel() {
    if (!this.emojiPanel) return;
    this.emojiPanel.classList.remove('show');
    setTimeout(() => this.emojiPanel.classList.add('hidden'), 160);
    // clear inline positioning after hide
    setTimeout(() => {
      if (this.emojiPanel) {
        this.emojiPanel.style.left = '';
        this.emojiPanel.style.top = '';
      }
      // clear any saved selection when the panel is closed explicitly
      this.clearSavedSelection();
    }, 200);
    if (this.openEmojiBtn) this.openEmojiBtn.classList.remove('active');
  }

  populateEmojiGrid() {
    if (!this.emojiGrid) return;
    const category = this.activeEmojiCategory || 'all';
    // larger categorized emoji dataset (ZWJ-containing sequences will be stripped later)
    const emojiSets =
      this._emojiSets ||
      Object.fromEntries(Object.entries(EMOJI_SETS).map(([key, list]) => [key, [...list]]));
    // remove any emoji sequences that contain ZERO WIDTH JOINER U+200D (these often render as multiple glyphs in some fonts)
    Object.keys(emojiSets).forEach((k) => {
      emojiSets[k] = (emojiSets[k] || []).filter(
        (ch) => typeof ch === 'string' && ch.indexOf('\u200D') === -1 && ch.indexOf('\u200d') === -1
      );
      // also dedupe
      emojiSets[k] = Array.from(new Set(emojiSets[k]));
    });
    // build 'all' set once
    if (!this._emojiSets) {
      const all = [];
      Object.keys(emojiSets).forEach((k) => {
        if (k === 'all') return;
        all.push(...emojiSets[k]);
      });
      emojiSets.all = Array.from(new Set(all));
      this._emojiSets = emojiSets;
    }

    // Build a simple English keyword map for each emoji.
    // Start with a few explicit keywords for commonly searched items, then
    // fall back to the category name so every emoji has at least one English keyword.
    try {
      // Build a consistent emoji -> array-of-english-keywords map once
      this._emojiKeywordMap = this._buildEnglishEmojiKeywordMap();
    } catch (e) {
      console.warn('Failed to initialize emoji keyword map:', e);
      this._emojiKeywordMap = this._emojiKeywordMap || {};
    }

    const emojis = Array.from(this._emojiSets[category] || this._emojiSets.all || []);
    // dedupe to ensure a stable order and no duplicates
    try {
      const uniq = Array.from(new Set(emojis));
      emojis.length = 0;
      emojis.push(...uniq);
    } catch (e) {
      // ignore any unexpected errors while normalizing the list
    }
    this.emojiGrid.innerHTML = '';
    emojis.forEach((emoji) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-grid-btn';
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        // restore the saved editor selection (if any) before inserting so the emoji goes into the editor
        try {
          if (this.savedSelection) {
            this.restoreEditorSelection();
          }
        } catch (err) {
          // ignore restore errors
        }
        // make sure editor has focus before insertion
        this.richEditor && this.richEditor.focus();

        this.insertTextAtCursor(emoji);
        this.trackContentChanges();

        // update savedSelection to the new caret position after insertion so subsequent clicks insert at the updated spot
        this.captureEditorSelection();

        // NOTE: Do NOT hide the panel here. The panel should only close when the user presses the close button.
      });
      this.emojiGrid.appendChild(btn);
    });
  }

  // initialize emoji tabs and category switching
  initEmojiTabs() {
    if (!this.emojiPanel) return;
    const tabs = Array.from(this.emojiPanel.querySelectorAll('.emoji-tab'));
    const tabsContainer = this.emojiPanel.querySelector('.emoji-tabs');
    // Add drag-to-scroll functionality to the tabs container (mouse & touch)
    if (tabsContainer) {
      let isDown = false;
      let startX;
      let scrollLeftStart;

      tabsContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        tabsContainer.classList.add('dragging');
        startX = e.pageX - tabsContainer.offsetLeft;
        scrollLeftStart = tabsContainer.scrollLeft;
        // prevent text selection while dragging
        e.preventDefault();
      });
      document.addEventListener('mouseup', () => {
        if (!isDown) return;
        isDown = false;
        tabsContainer.classList.remove('dragging');
      });
      document.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const x = e.pageX - tabsContainer.offsetLeft;
        const walk = (x - startX) * 1; // scroll-fast multiplier
        tabsContainer.scrollLeft = scrollLeftStart - walk;
      });

      // touch support
      tabsContainer.addEventListener(
        'touchstart',
        (e) => {
          if (e.touches.length !== 1) return;
          startX = e.touches[0].pageX - tabsContainer.offsetLeft;
          scrollLeftStart = tabsContainer.scrollLeft;
        },
        { passive: true }
      );
      tabsContainer.addEventListener(
        'touchmove',
        (e) => {
          if (e.touches.length !== 1) return;
          const x = e.touches[0].pageX - tabsContainer.offsetLeft;
          const walk = (x - startX) * 1;
          tabsContainer.scrollLeft = scrollLeftStart - walk;
        },
        { passive: true }
      );
    }
    tabs.forEach((t) => {
      t.addEventListener('click', (e) => {
        const cat = t.dataset.category || 'all';
        // toggle aria-selected and active
        tabs.forEach((tb) => {
          tb.classList.remove('active');
          tb.setAttribute('aria-selected', 'false');
        });
        t.classList.add('active');
        t.setAttribute('aria-selected', 'true');
        this.activeEmojiCategory = cat;
        this.populateEmojiGrid();
        // refocus search input
        setTimeout(() => {
          this.emojiSearchInput && this.emojiSearchInput.focus();
        }, 50);
      });
    });
  }

  filterEmojiGrid(query) {
    if (!this.emojiGrid) return;
    const q = this.normalizeForSearch(query || '');
    // Ensure english-only emoji keyword map exists
    if (!this._emojiKeywordMap) this._emojiKeywordMap = this._buildEnglishEmojiKeywordMap();
    const emojiKeywordMap = this._emojiKeywordMap || {};
    Array.from(this.emojiGrid.children).forEach((btn) => {
      const emoji = (btn.textContent || '').trim();
      if (!q) {
        btn.style.display = '';
        return;
      }
      // If the user pasted the emoji character itself, allow that match
      const charMatch = emoji.includes(q);
      // Match against our english keyword map
      let engMatch = false;
      const engKeywords = emojiKeywordMap[emoji] || [];
      for (let i = 0; i < engKeywords.length; i++) {
        const kw = this.normalizeForSearch(String(engKeywords[i] || ''));
        if (!kw) continue;
        if (kw.indexOf(q) !== -1 || q.indexOf(kw) !== -1) {
          engMatch = true;
          break;
        }
      }
      btn.style.display = charMatch || engMatch ? '' : 'none';
    });
  }

  // Map emoji to localized keywords to support text search for moods/weather
  // Build a single English-only emoji keyword map.
  // Each emoji maps to an array of English keywords (at least one). This is the
  // authoritative source used by emoji search and mood/weather note searching.
  _buildEnglishEmojiKeywordMap() {
    // Explicit mappings for common emojis. Keep keys as the emoji character.
    const explicit = EMOJI_KEYWORDS;

    // For any emoji not explicitly listed, we'll fallback to the category name
    // during map construction so every emoji has at least one English keyword.
    const map = Object.assign({}, explicit);
    try {
      if (this._emojiSets) {
        Object.keys(this._emojiSets).forEach((cat) => {
          (this._emojiSets[cat] || []).forEach((emoji) => {
            if (!map[emoji]) {
              // Use the category name as a single-word fallback keyword
              map[emoji] = [String(cat).toLowerCase()];
            } else {
              // normalize explicit keywords: lowercase and dedupe
              const kws = Array.from(
                new Set(
                  (map[emoji] || []).map((k) => String(k || '').toLowerCase()).filter(Boolean)
                )
              );
              map[emoji] = kws.length ? kws : [String(cat).toLowerCase()];
            }
          });
        });
      }
    } catch (e) {
      // If anything goes wrong, return explicit map only
      console.warn('Failed building full emoji keyword map:', e);
    }

    return map;
  }
}
