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
        </div>
      </div>
      <div class="page-actions editor-actions">
        <div class="editor-view-tools">
          <!-- Back to reading the note (it is saved as it is written; Escape does the same) -->
          <button class="format-btn" id="readViewBtn" data-i18n-title="titles.readView">
            <i class="fas fa-book-open"></i>
          </button>
          <button
            class="format-btn"
            id="toggleMarkdownBtn"
            data-i18n-title="titles.markdownPreview"
          >
            <i class="fas fa-file-code"></i>
          </button>
          <button class="format-btn" id="toggleSidebar" data-i18n-title="titles.toggleSidebar">
            <i class="fas fa-columns"></i>
          </button>
          <button class="format-btn" id="focusModeBtn" data-i18n-title="titles.focusMode">
            <i class="fas fa-expand"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Markdown toolbar: for a .md file, which is edited as its Markdown text; each button writes
         the Markdown syntax into the text -->
    <div class="md-toolbar">
      <div class="format-group">
        <button class="format-btn" data-md="h1" data-i18n-title="mdToolbar.h1">
          <span class="md-btn-text">H1</span>
        </button>
        <button class="format-btn" data-md="h2" data-i18n-title="mdToolbar.h2">
          <span class="md-btn-text">H2</span>
        </button>
        <button class="format-btn" data-md="h3" data-i18n-title="mdToolbar.h3">
          <span class="md-btn-text">H3</span>
        </button>
      </div>

      <div class="format-group">
        <button class="format-btn" data-md="bold" data-i18n-title="mdToolbar.bold">
          <i class="fas fa-bold"></i>
        </button>
        <button class="format-btn" data-md="italic" data-i18n-title="mdToolbar.italic">
          <i class="fas fa-italic"></i>
        </button>
        <button class="format-btn" data-md="strike" data-i18n-title="mdToolbar.strike">
          <i class="fas fa-strikethrough"></i>
        </button>
        <button class="format-btn" data-md="code" data-i18n-title="mdToolbar.code">
          <i class="fas fa-code"></i>
        </button>
        <button class="format-btn" data-md="link" data-i18n-title="mdToolbar.link">
          <i class="fas fa-link"></i>
        </button>
      </div>

      <div class="format-group">
        <button class="format-btn" data-md="ul" data-i18n-title="mdToolbar.ul">
          <i class="fas fa-list-ul"></i>
        </button>
        <button class="format-btn" data-md="ol" data-i18n-title="mdToolbar.ol">
          <i class="fas fa-list-ol"></i>
        </button>
        <button class="format-btn" data-md="task" data-i18n-title="mdToolbar.task">
          <i class="fas fa-list-check"></i>
        </button>
        <button class="format-btn" data-md="quote" data-i18n-title="mdToolbar.quote">
          <i class="fas fa-quote-right"></i>
        </button>
      </div>

      <div class="format-group">
        <button class="format-btn" data-md="codeblock" data-i18n-title="mdToolbar.codeblock">
          <i class="fas fa-file-code"></i>
        </button>
        <button class="format-btn" data-md="table" data-i18n-title="mdToolbar.table">
          <i class="fas fa-table"></i>
        </button>
        <button class="format-btn" data-md="hr" data-i18n-title="mdToolbar.hr">
          <i class="fas fa-minus"></i>
        </button>
      </div>
    </div>

    <!-- Formatting Toolbar: the text style, character styles, colors, alignment, lists and things
         to insert (the previews and the side panel are view controls, in the header). The text
         style, bold to strikethrough, colors, alignment, an image, a file and the link in view;
         lists and the other insert tools in small menus that open under their button -->
    <div class="formatting-toolbar">
      <div class="format-group">
        <div class="custom-select format-custom-select" id="blockStyle">
          <div class="select-selected" data-i18n="blockStyle.p">Metin</div>
          <div class="select-items menu select-hide">
            <div data-value="p" class="select-item active" data-i18n="blockStyle.p">Metin</div>
            <div data-value="h1" class="select-item select-item-h1" data-i18n="blockStyle.h1">
              Başlık 1
            </div>
            <div data-value="h2" class="select-item select-item-h2" data-i18n="blockStyle.h2">
              Başlık 2
            </div>
            <div data-value="h3" class="select-item select-item-h3" data-i18n="blockStyle.h3">
              Başlık 3
            </div>
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
        <button
          class="format-btn"
          data-format="strikeThrough"
          data-i18n-title="titles.strikethrough"
        >
          <i class="fas fa-strikethrough"></i>
        </button>
      </div>

      <div class="format-group">
        <input
          type="color"
          id="textColor"
          class="color-picker"
          value="#363636"
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
        <div class="toolbar-menu" id="listMenu">
          <button
            type="button"
            class="format-btn toolbar-menu-trigger"
            data-i18n-title="toolbar.lists"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <i class="fas fa-list-ul"></i>
            <i class="fas fa-chevron-down toolbar-caret"></i>
          </button>
          <div class="toolbar-popover menu toolbar-popover-row hidden">
            <button class="format-btn" id="insertList" data-i18n-title="titles.bulletList">
              <i class="fas fa-list-ul"></i>
            </button>
            <button
              class="format-btn"
              id="insertNumberedList"
              data-i18n-title="titles.numberedList"
            >
              <i class="fas fa-list-ol"></i>
            </button>
            <button class="format-btn" id="insertChecklist" data-i18n-title="titles.taskList">
              <i class="fas fa-tasks"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="format-group">
        <button class="format-btn" id="browseImageBtn" data-i18n-title="toolbar.image">
          <i class="fas fa-image"></i>
        </button>
        <input id="browseImageInput" class="hidden" type="file" accept="image/*" />
        <button class="format-btn" id="addNoteFileBtn" data-i18n-title="noteFiles.add">
          <i class="fas fa-paperclip"></i>
        </button>
        <button class="format-btn" id="insertLinkBtn" data-i18n-title="titles.link">
          <i class="fas fa-link"></i>
        </button>
        <div class="toolbar-menu" id="insertMenu">
          <button
            type="button"
            class="format-btn toolbar-menu-trigger"
            data-i18n-title="toolbar.insert"
            aria-haspopup="true"
            aria-expanded="false"
          >
            <i class="fas fa-plus"></i>
            <i class="fas fa-chevron-down toolbar-caret"></i>
          </button>
          <div class="toolbar-popover menu toolbar-popover-list hidden">
            <button class="format-btn" id="insertQuoteBtn" data-i18n-title="toolbar.quote">
              <i class="fas fa-quote-right"></i>
              <span data-i18n="toolbar.quote">Alıntı</span>
            </button>
            <button class="format-btn" id="insertDividerBtn" data-i18n-title="toolbar.divider">
              <i class="fas fa-minus"></i>
              <span data-i18n="toolbar.divider">Ayırıcı çizgi</span>
            </button>
            <button class="format-btn" id="insertTableBtn" data-i18n-title="toolbar.table">
              <i class="fas fa-table"></i>
              <span data-i18n="toolbar.table">Tablo</span>
            </button>
            <button class="format-btn" id="insertCodeBlockBtn" data-i18n-title="toolbar.codeBlock">
              <i class="fas fa-laptop-code"></i>
              <span data-i18n="toolbar.codeBlock">Kod bloğu</span>
            </button>
            <button class="format-btn" id="insertDate" data-i18n-title="toolbar.date">
              <i class="fas fa-calendar-plus"></i>
              <span data-i18n="toolbar.date">Tarih</span>
            </button>
            <button class="format-btn" id="insertTime" data-i18n-title="toolbar.time">
              <i class="fas fa-clock"></i>
              <span data-i18n="toolbar.time">Saat</span>
            </button>
          </div>
        </div>
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
            <div class="reminder-when">
              <button
                type="button"
                id="reminderDateBtn"
                class="reminder-when-btn"
                aria-haspopup="dialog"
                aria-expanded="false"
              >
                <i class="fas fa-calendar-day"></i>
                <span id="reminderDateText" class="reminder-when-text">Tarih</span>
              </button>
              <button
                type="button"
                id="reminderTimeBtn"
                class="reminder-when-btn"
                aria-haspopup="dialog"
                aria-expanded="false"
              >
                <i class="fas fa-clock"></i>
                <span id="reminderTimeText" class="reminder-when-text">Saat</span>
              </button>
            </div>
            <input type="hidden" id="reminderDatetime" class="reminder-datetime-input" />
            <div class="reminder-repeat">
              <span class="reminder-repeat-label">
                <i class="fas fa-repeat"></i>
                <span data-i18n="reminder.recurrence">Tekrarlama</span>
              </span>
              <div
                id="reminderRepeat"
                class="segmented reminder-repeat-options"
                role="radiogroup"
                data-i18n-aria-label="reminder.recurrence"
                aria-label="Tekrarlama"
              >
                <button
                  type="button"
                  class="segment"
                  role="radio"
                  data-value="none"
                  data-i18n="reminder.none"
                >
                  Yok
                </button>
                <button
                  type="button"
                  class="segment"
                  role="radio"
                  data-value="daily"
                  data-i18n="reminder.daily"
                >
                  Günlük
                </button>
                <button
                  type="button"
                  class="segment"
                  role="radio"
                  data-value="weekly"
                  data-i18n="reminder.weekly"
                >
                  Haftalık
                </button>
                <button
                  type="button"
                  class="segment"
                  role="radio"
                  data-value="monthly"
                  data-i18n="reminder.monthly"
                >
                  Aylık
                </button>
              </div>
            </div>
            <select id="reminderRecurrence" hidden aria-hidden="true" tabindex="-1">
              <option value="none">none</option>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
            </select>
            <div id="reminderWeekdays" class="reminder-weekdays hidden" aria-hidden="true">
              <div
                class="weekday-list"
                role="group"
                data-i18n-aria-label="reminder.days"
                aria-label="Günler"
              >
                <label class="weekday-pill"
                  ><input type="checkbox" value="1" class="weekday-checkbox" />
                  <span data-i18n="reminder.mon">Pzt</span></label
                >
                <label class="weekday-pill"
                  ><input type="checkbox" value="2" class="weekday-checkbox" />
                  <span data-i18n="reminder.tue">Sal</span></label
                >
                <label class="weekday-pill"
                  ><input type="checkbox" value="3" class="weekday-checkbox" />
                  <span data-i18n="reminder.wed">Çar</span></label
                >
                <label class="weekday-pill"
                  ><input type="checkbox" value="4" class="weekday-checkbox" />
                  <span data-i18n="reminder.thu">Per</span></label
                >
                <label class="weekday-pill"
                  ><input type="checkbox" value="5" class="weekday-checkbox" />
                  <span data-i18n="reminder.fri">Cum</span></label
                >
                <label class="weekday-pill"
                  ><input type="checkbox" value="6" class="weekday-checkbox" />
                  <span data-i18n="reminder.sat">Cmt</span></label
                >
                <label class="weekday-pill"
                  ><input type="checkbox" value="0" class="weekday-checkbox" />
                  <span data-i18n="reminder.sun">Paz</span></label
                >
              </div>
            </div>
            <button id="setReminderBtn" class="btn-primary btn-small reminder-add">
              <i class="fas fa-bell"></i> <span data-i18n="reminder.add">Hatırlatma kur</span>
            </button>
            <div id="noteRemindersList" class="note-reminders-list"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Files attached to the note -->
    <div id="editorFiles" class="backlinks note-files hidden">
      <span class="backlinks-label">
        <i class="fas fa-paperclip"></i>
        <span data-i18n="noteFiles.label">Ekler:</span>
        <small class="note-files-size"></small>
      </span>
      <div class="backlinks-list note-files-list"></div>
    </div>
  </div>
`;
