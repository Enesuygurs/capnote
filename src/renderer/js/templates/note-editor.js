// Markup of the note editor: header, formatting toolbar, editing area and sidebar

export const NOTE_EDITOR = /* HTML */ `
  <!-- Note editor -->
  <div id="noteEditor" class="note-editor hidden">
    <div class="page-header editor-header">
      <div class="page-heading">
        <input
          type="text"
          id="noteTitle"
          data-i18n-placeholder="placeholders.noteTitle"
          placeholder="Not başlığı..."
          class="page-title note-title-input"
        />
        <div class="page-meta note-meta">
          <span id="noteDate"></span>
          <span id="wordCount">0 <span data-i18n="stats.words">kelime</span></span>
          <span id="charCount">0 <span data-i18n="stats.characters">karakter</span></span>
          <span id="editorReadingTime">~0 <span data-i18n="stats.readingTime">dk okuma</span></span>
        </div>
      </div>
      <div class="page-actions editor-actions">
        <button id="cancelNoteBtn" class="btn-secondary" data-i18n="buttons.cancel">İptal</button>
        <button id="saveNoteBtn" class="btn-primary">
          <i class="fas fa-check"></i>
          <span data-i18n="buttons.save">Kaydet</span>
        </button>
      </div>
    </div>

    <!-- Formatting Toolbar -->
    <div class="formatting-toolbar">
      <div class="format-group">
        <div class="custom-select format-custom-select" id="fontFamily">
          <div class="select-selected">Inter</div>
          <div class="select-items menu select-hide">
            <div data-value="Inter" class="select-item active">Inter</div>
            <div data-value="Crimson Text" class="select-item">Crimson Text</div>
            <div data-value="Roboto Mono" class="select-item">Roboto Mono</div>
            <div data-value="Georgia" class="select-item">Georgia</div>
            <div data-value="Arial" class="select-item">Arial</div>
          </div>
        </div>
        <div class="custom-select format-custom-select" id="fontSize">
          <div class="select-selected">14px</div>
          <div class="select-items menu select-hide">
            <div data-value="12" class="select-item">12px</div>
            <div data-value="14" class="select-item active">14px</div>
            <div data-value="16" class="select-item">16px</div>
            <div data-value="18" class="select-item">18px</div>
            <div data-value="20" class="select-item">20px</div>
            <div data-value="24" class="select-item">24px</div>
          </div>
        </div>
      </div>

      <div class="format-group">
        <button class="format-btn" data-format="bold" data-i18n-title="titles.bold">
          <i class="fas fa-bold"></i>
        </button>
        <button class="format-btn" data-format="italic" data-i18n-title="titles.italic">
          <i class="fas fa-italic"></i>
        </button>
        <button class="format-btn" data-format="underline" data-i18n-title="titles.underline">
          <i class="fas fa-underline"></i>
        </button>
      </div>

      <div class="format-group">
        <input
          type="color"
          id="textColor"
          class="color-picker"
          value="#000000"
          data-i18n-title="titles.textColor"
        />
        <input
          type="color"
          id="bgColor"
          class="color-picker"
          value="#ffffff"
          data-i18n-title="titles.bgColor"
        />
      </div>

      <div class="format-group">
        <button class="format-btn" data-align="left" data-i18n-title="titles.alignLeft">
          <i class="fas fa-align-left"></i>
        </button>
        <button class="format-btn" data-align="center" data-i18n-title="titles.alignCenter">
          <i class="fas fa-align-center"></i>
        </button>
        <button class="format-btn" data-align="right" data-i18n-title="titles.alignRight">
          <i class="fas fa-align-right"></i>
        </button>
        <button class="format-btn" data-align="justify" data-i18n-title="titles.alignJustify">
          <i class="fas fa-align-justify"></i>
        </button>
      </div>

      <div class="format-group">
        <button class="format-btn" id="insertList" data-i18n-title="titles.bulletList">
          <i class="fas fa-list-ul"></i>
        </button>
        <button class="format-btn" id="insertChecklist" data-i18n-title="titles.taskList">
          <i class="fas fa-tasks"></i>
        </button>
        <button class="format-btn" id="insertNumberedList" data-i18n-title="titles.numberedList">
          <i class="fas fa-list-ol"></i>
        </button>
        <button class="format-btn" id="insertTableBtn" data-i18n-title="titles.insertTable">
          <i class="fas fa-table"></i>
        </button>
      </div>

      <div class="format-group">
        <button class="format-btn" id="insertDate" data-i18n-title="titles.insertDate">
          <i class="fas fa-calendar-plus"></i>
        </button>
        <button class="format-btn" id="insertTime" data-i18n-title="titles.insertTime">
          <i class="fas fa-clock"></i>
        </button>
      </div>

      <div class="format-group">
        <button
          class="format-btn small-toolbar-btn"
          id="browseImageBtn"
          data-i18n-title="titles.insertImage"
        >
          <i class="fas fa-file-import"></i>
        </button>
        <input id="browseImageInput" class="hidden" type="file" accept="image/*" />
        <button
          class="format-btn small-toolbar-btn"
          id="toggleMarkdownBtn"
          data-i18n-title="titles.markdownPreview"
        >
          <i class="fas fa-file-code"></i>
        </button>
        <button
          class="format-btn small-toolbar-btn"
          id="toggleHtmlBtn"
          data-i18n-title="titles.htmlPreview"
        >
          <i class="fas fa-code"></i>
        </button>
        <button
          class="format-btn small-toolbar-btn"
          id="insertCodeBlockBtn"
          data-i18n-title="titles.codeBlock"
        >
          <i class="fas fa-laptop-code"></i>
        </button>
        <button
          class="format-btn small-toolbar-btn"
          id="openEmojiBtn"
          data-i18n-title="titles.emoji"
        >
          <i class="fas fa-face-smile"></i>
        </button>
      </div>
      <div class="format-group">
        <button class="format-btn" id="toggleSidebar" data-i18n-title="titles.toggleSidebar">
          <i class="fas fa-columns"></i>
        </button>
      </div>
    </div>

    <div class="editor-content">
      <div class="note-content">
        <textarea
          id="markdownEditor"
          class="markdown-editor hidden"
          data-i18n-placeholder="placeholders.markdown"
        ></textarea>
        <div
          id="noteContentEditable"
          class="rich-editor"
          contenteditable="true"
          data-i18n-placeholder="placeholders.noteContent"
        ></div>
        <div id="markdownPreview" class="markdown-preview hidden" aria-hidden="true"></div>
        <div id="htmlPreview" class="html-preview hidden" aria-hidden="true"></div>
        <!-- Emoji panel (hidden by default) -->
        <div id="emojiPanel" class="emoji-panel menu hidden">
          <div class="emoji-panel-header">
            <input
              type="text"
              id="emojiSearchInput"
              data-i18n-placeholder="placeholders.searchEmoji"
              placeholder="Emoji ara..."
            />
          </div>
          <!-- Emoji category tabs (clean professional layout) -->
          <div class="emoji-tabs-wrap professional">
            <div class="emoji-tabs-shell">
              <div
                class="emoji-tabs"
                role="tablist"
                data-i18n-aria-label="emojiCategories.all"
                aria-label="Emoji kategorileri"
              >
                <button
                  class="emoji-tab active"
                  data-category="all"
                  role="tab"
                  aria-selected="true"
                  data-i18n-aria-label="emojiCategories.all"
                  aria-label="Tümü"
                >
                  <i class="fas fa-th-large" aria-hidden="true"></i>
                </button>
                <button
                  class="emoji-tab"
                  data-category="smileys"
                  role="tab"
                  data-i18n-aria-label="emojiCategories.smileys"
                  aria-label="Gülücükler"
                >
                  <i class="far fa-smile" aria-hidden="true"></i>
                </button>
                <button
                  class="emoji-tab"
                  data-category="people"
                  role="tab"
                  data-i18n-aria-label="emojiCategories.people"
                  aria-label="İnsanlar"
                >
                  <i class="fas fa-user" aria-hidden="true"></i>
                </button>
                <button
                  class="emoji-tab"
                  data-category="animals"
                  role="tab"
                  data-i18n-aria-label="emojiCategories.animals"
                  aria-label="Hayvanlar"
                >
                  <i class="fas fa-paw" aria-hidden="true"></i>
                </button>
                <button
                  class="emoji-tab"
                  data-category="food"
                  role="tab"
                  data-i18n-aria-label="emojiCategories.food"
                  aria-label="Yemek"
                >
                  <i class="fas fa-hamburger" aria-hidden="true"></i>
                </button>
                <button
                  class="emoji-tab"
                  data-category="activities"
                  role="tab"
                  data-i18n-aria-label="emojiCategories.activities"
                  aria-label="Aktiviteler"
                >
                  <i class="fas fa-futbol" aria-hidden="true"></i>
                </button>
                <button
                  class="emoji-tab"
                  data-category="travel"
                  role="tab"
                  data-i18n-aria-label="emojiCategories.travel"
                  aria-label="Seyahat"
                >
                  <i class="fas fa-plane" aria-hidden="true"></i>
                </button>
                <button
                  class="emoji-tab"
                  data-category="objects"
                  role="tab"
                  data-i18n-aria-label="emojiCategories.objects"
                  aria-label="Nesneler"
                >
                  <i class="fas fa-lightbulb" aria-hidden="true"></i>
                </button>
                <button
                  class="emoji-tab"
                  data-category="symbols"
                  role="tab"
                  data-i18n-aria-label="emojiCategories.symbols"
                  aria-label="Semboller"
                >
                  <i class="fas fa-bookmark" aria-hidden="true"></i>
                </button>
                <button
                  class="emoji-tab"
                  data-category="flags"
                  role="tab"
                  data-i18n-aria-label="emojiCategories.flags"
                  aria-label="Bayraklar"
                >
                  <i class="fas fa-flag" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </div>
          <div id="emojiGrid" class="emoji-grid" aria-live="polite">
            <!-- Emoji buttons populated by JS -->
          </div>
        </div>
      </div>

      <div class="editor-sidebar">
        <div class="sidebar-section">
          <h4 class="panel-label" data-i18n="sections.mood">Ruh Hali</h4>
          <div class="mood-selector">
            <button class="mood-btn" data-mood="happy" data-i18n-title="titles.happy">
              <i class="fas fa-face-smile" aria-hidden="true"></i>
            </button>
            <button class="mood-btn" data-mood="sad" data-i18n-title="titles.sad">
              <i class="fas fa-face-sad-tear" aria-hidden="true"></i>
            </button>
            <button class="mood-btn" data-mood="angry" data-i18n-title="titles.angry">
              <i class="fas fa-face-angry" aria-hidden="true"></i>
            </button>
            <button class="mood-btn" data-mood="tired" data-i18n-title="titles.tired">
              <i class="fas fa-face-tired" aria-hidden="true"></i>
            </button>
            <button class="mood-btn" data-mood="inLove" data-i18n-title="titles.inLove">
              <i class="fas fa-face-grin-hearts" aria-hidden="true"></i>
            </button>
            <button class="mood-btn" data-mood="thoughtful" data-i18n-title="titles.thoughtful">
              <i class="fas fa-face-meh" aria-hidden="true"></i>
            </button>
            <button class="mood-btn" data-mood="cool" data-i18n-title="titles.cool">
              <i class="fas fa-face-smile-wink" aria-hidden="true"></i>
            </button>
            <button class="mood-btn" data-mood="bored" data-i18n-title="titles.bored">
              <i class="fas fa-face-rolling-eyes" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div class="sidebar-section">
          <h4 class="panel-label" data-i18n="sections.weather">Hava Durumu</h4>
          <div class="weather-selector">
            <button class="weather-btn" data-weather="sunny" data-i18n-title="titles.sunny">
              <i class="fas fa-sun" aria-hidden="true"></i>
            </button>
            <button
              class="weather-btn"
              data-weather="partlyCloudy"
              data-i18n-title="titles.partlyCloudy"
            >
              <i class="fas fa-cloud-sun" aria-hidden="true"></i>
            </button>
            <button class="weather-btn" data-weather="cloudy" data-i18n-title="titles.cloudy">
              <i class="fas fa-cloud" aria-hidden="true"></i>
            </button>
            <button class="weather-btn" data-weather="rainy" data-i18n-title="titles.rainy">
              <i class="fas fa-cloud-rain" aria-hidden="true"></i>
            </button>
            <button class="weather-btn" data-weather="stormy" data-i18n-title="titles.stormy">
              <i class="fas fa-cloud-bolt" aria-hidden="true"></i>
            </button>
            <button class="weather-btn" data-weather="snowy" data-i18n-title="titles.snowy">
              <i class="fas fa-snowflake" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div class="sidebar-section">
          <h4 class="panel-label" data-i18n="sections.tags">Etiketler</h4>
          <div class="tags-container">
            <input
              type="text"
              id="tagInput"
              class="form-input form-input-sm"
              data-i18n-placeholder="placeholders.addTag"
              placeholder="Etiket ekle..."
            />
            <div id="tagsList" class="tags-list"></div>
          </div>
        </div>

        <div class="sidebar-section">
          <h4 class="panel-label" data-i18n="sections.reminder">Hatırlatma</h4>
          <div class="reminder-container">
            <input
              type="datetime-local"
              id="reminderDatetime"
              class="form-input form-input-sm reminder-datetime-input"
            />
            <select
              id="reminderRecurrence"
              class="select-small select-block"
              data-i18n-aria-label="reminder.recurrence"
              aria-label="Tekrarlama"
            >
              <option value="none" data-i18n="reminder.none">Yok</option>
              <option value="daily" data-i18n="reminder.daily">Günlük</option>
              <option value="weekly" data-i18n="reminder.weekly">Haftalık</option>
              <option value="monthly" data-i18n="reminder.monthly">Aylık</option>
            </select>
            <div id="reminderWeekdays" class="reminder-weekdays hidden" aria-hidden="true">
              <label for="reminderWeekdays" data-i18n="reminder.days">Günler</label>
              <div class="weekday-list">
                <label
                  ><input type="checkbox" value="1" class="weekday-checkbox" />
                  <span data-i18n="reminder.mon">Pzt</span></label
                >
                <label
                  ><input type="checkbox" value="2" class="weekday-checkbox" />
                  <span data-i18n="reminder.tue">Sal</span></label
                >
                <label
                  ><input type="checkbox" value="3" class="weekday-checkbox" />
                  <span data-i18n="reminder.wed">Çar</span></label
                >
                <label
                  ><input type="checkbox" value="4" class="weekday-checkbox" />
                  <span data-i18n="reminder.thu">Per</span></label
                >
                <label
                  ><input type="checkbox" value="5" class="weekday-checkbox" />
                  <span data-i18n="reminder.fri">Cum</span></label
                >
                <label
                  ><input type="checkbox" value="6" class="weekday-checkbox" />
                  <span data-i18n="reminder.sat">Cmt</span></label
                >
                <label
                  ><input type="checkbox" value="0" class="weekday-checkbox" />
                  <span data-i18n="reminder.sun">Paz</span></label
                >
              </div>
            </div>
            <button id="setReminderBtn" class="btn-primary btn-small">
              <i class="fas fa-plus"></i> <span data-i18n="buttons.add">Ekle</span>
            </button>
            <div id="noteRemindersList" class="note-reminders-list"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
