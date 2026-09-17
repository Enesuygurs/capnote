// Markup of the smaller dialogs and the folder context menu.
// Every dialog has the same parts: .modal-header (title + close), .modal-body, .modal-footer.

export const NOTE_DIALOGS = /* HTML */ `
  <!-- Export Modal -->
  <div id="exportModal" class="modal hidden">
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title">
          <h3 data-i18n="modals.exportNote">Notu Dışa Aktar</h3>
        </div>
        <button class="modal-close" id="closeExportModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body export-options">
        <button class="export-btn" data-type="txt">
          <i class="fas fa-file-lines"></i>
          <span data-i18n="export.plainText">Düz Metin (.txt)</span>
        </button>
        <button class="export-btn" data-type="html">
          <i class="fas fa-code"></i>
          <span data-i18n="export.html">HTML (.html)</span>
        </button>
        <button class="export-btn" data-type="pdf">
          <i class="fas fa-file-pdf"></i>
          <span data-i18n="export.pdf">PDF (.pdf)</span>
        </button>
        <button class="export-btn" data-type="json">
          <i class="fas fa-file-code"></i>
          <span data-i18n="export.json">JSON (.json)</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Templates to start a new note from -->
  <div id="templateMenu" class="context-menu menu hidden" role="menu">
    <button class="menu-item" data-template="blank" role="menuitem">
      <i class="fas fa-file"></i>
      <span data-i18n="noteTemplates.blank">Boş not</span>
    </button>
    <button class="menu-item" data-template="journal" role="menuitem">
      <i></i>
      <span data-i18n="noteTemplates.journal">Günlük</span>
    </button>
    <button class="menu-item" data-template="meeting" role="menuitem">
      <i></i>
      <span data-i18n="noteTemplates.meeting">Toplantı notu</span>
    </button>
    <button class="menu-item" data-template="weekly" role="menuitem">
      <i></i>
      <span data-i18n="noteTemplates.weekly">Haftalık plan</span>
    </button>
  </div>

  <!-- The day and time of a reminder: a month calendar, then hour and minute columns -->
  <div
    id="reminderPicker"
    class="context-menu menu date-picker hidden"
    role="dialog"
    data-i18n-aria-label="reminder.pick"
    aria-label="Tarih ve saat seçin"
  >
    <div class="date-picker-header">
      <span class="date-picker-title"></span>
      <div class="date-picker-nav">
        <button
          type="button"
          class="btn-icon btn-icon-xs"
          data-month="-1"
          data-i18n-title="reminder.prevMonth"
          title="Önceki ay"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <button
          type="button"
          class="btn-icon btn-icon-xs"
          data-month="1"
          data-i18n-title="reminder.nextMonth"
          title="Sonraki ay"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
    <div class="date-picker-weekdays"></div>
    <div class="date-picker-days"></div>
    <div class="date-picker-time">
      <span class="date-picker-time-label">
        <i class="fas fa-clock"></i> <span data-i18n="reminder.time">Saat</span>
      </span>
      <div class="time-columns">
        <div
          class="time-column"
          data-unit="hour"
          data-i18n-aria-label="reminder.hour"
          aria-label="Saat"
        ></div>
        <span class="time-separator">:</span>
        <div
          class="time-column"
          data-unit="minute"
          data-i18n-aria-label="reminder.minute"
          aria-label="Dakika"
        ></div>
      </div>
    </div>
    <div class="date-picker-footer">
      <button type="button" class="btn-secondary btn-small" data-action="clear">
        <span data-i18n="reminder.clear">Temizle</span>
      </button>
      <button type="button" class="btn-primary btn-small" data-action="done">
        <span data-i18n="reminder.done">Tamam</span>
      </button>
    </div>
  </div>

  <!-- Notes suggested while typing "[[" in the editor -->
  <div id="noteLinkMenu" class="context-menu menu note-link-menu hidden" role="listbox"></div>

  <!-- Link dialog -->
  <div id="linkModal" class="modal hidden">
    <div class="modal-content modal-sm">
      <div class="modal-header">
        <div class="modal-title">
          <h3 data-i18n="modals.link">Bağlantı</h3>
        </div>
        <button class="modal-close" id="closeLinkModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="linkTextInput" data-i18n="modals.linkText">Metin</label>
          <input id="linkTextInput" class="form-input" type="text" />
        </div>
        <div class="form-group">
          <label for="linkUrlInput" data-i18n="modals.linkUrl">Adres</label>
          <input
            id="linkUrlInput"
            class="form-input"
            type="text"
            placeholder="https://"
            spellcheck="false"
          />
        </div>
      </div>
      <div class="modal-footer">
        <button
          id="removeLinkBtn"
          class="btn btn-outline btn-danger hidden"
          data-i18n="buttons.removeLink"
        >
          Bağlantıyı kaldır
        </button>
        <button id="cancelLinkBtn" class="btn btn-secondary" data-i18n="buttons.cancel">
          İptal
        </button>
        <button id="applyLinkBtn" class="btn btn-primary" data-i18n="buttons.save">Kaydet</button>
      </div>
    </div>
  </div>

  <!-- Table modal -->
  <div id="tableModal" class="modal hidden">
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title">
          <h3 data-i18n="modals.addTable">Tablo Ekle</h3>
        </div>
        <button class="modal-close" id="closeTableModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label for="tableRows" data-i18n="modals.tableRows">Satır sayısı</label>
            <input id="tableRows" class="form-input" type="number" min="1" value="2" />
          </div>
          <div class="form-group">
            <label for="tableCols" data-i18n="modals.tableCols">Sütun sayısı</label>
            <input id="tableCols" class="form-input" type="number" min="1" value="2" />
          </div>
        </div>
        <label class="form-check" for="tableHeader">
          <input id="tableHeader" type="checkbox" />
          <span data-i18n="modals.tableHeader">Başlık satırı ekle</span>
        </label>
      </div>
      <div class="modal-footer">
        <button id="cancelTableBtn" class="btn btn-secondary" data-i18n="buttons.cancel">
          İptal
        </button>
        <button id="insertTableConfirmBtn" class="btn btn-primary" data-i18n="buttons.add">
          Ekle
        </button>
      </div>
    </div>
  </div>

  <!-- Note History Modal -->
  <div id="noteHistoryModal" class="modal hidden">
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title">
          <h3 data-i18n="modals.noteHistory">Not Geçmişi</h3>
        </div>
        <button class="modal-close" id="closeHistoryModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body history-body" id="historyBody">
        <!-- history entries will be injected here -->
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="historyCloseBtn" data-i18n="buttons.close">
          Kapat
        </button>
      </div>
    </div>
  </div>
`;

export const APP_DIALOGS = /* HTML */ `
  <!-- Confirm dialog -->
  <div id="confirmModal" class="modal hidden">
    <div class="modal-content modal-sm">
      <div class="modal-header">
        <div class="modal-title">
          <h3 data-i18n="modals.confirmAction">İşlemi Onayla</h3>
        </div>
        <button class="modal-close" id="closeConfirmModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <p id="confirmMessage" class="modal-text" data-i18n="modals.confirmMessage">
          Bu işlemi gerçekleştirmek istediğinizden emin misiniz?
        </p>
      </div>
      <div class="modal-footer">
        <button id="cancelBtn" class="btn btn-secondary" data-i18n="buttons.cancel">İptal</button>
        <button id="confirmBtn" class="btn btn-danger" data-i18n="buttons.confirm">Onayla</button>
      </div>
    </div>
  </div>

  <!-- Password Modal -->
  <div id="passwordModal" class="modal hidden">
    <div class="modal-content modal-sm">
      <div class="modal-header">
        <div class="modal-title">
          <h3 id="passwordModalTitle" data-i18n="modals.enterPassword">Şifre Girin</h3>
        </div>
        <button class="modal-close" id="closePasswordModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <p id="passwordMessage" class="modal-text form-message"></p>
        <div class="form-group">
          <label for="passwordInput" data-i18n="modals.password">Şifre:</label>
          <input
            type="password"
            id="passwordInput"
            class="form-input"
            data-i18n-placeholder="placeholders.password"
            placeholder="Şifre girin..."
            autocomplete="off"
          />
        </div>
      </div>
      <div class="modal-footer">
        <button id="cancelPasswordBtn" class="btn btn-secondary" data-i18n="buttons.cancel">
          İptal
        </button>
        <button id="confirmPasswordBtn" class="btn btn-primary" data-i18n="buttons.confirm">
          Onayla
        </button>
      </div>
    </div>
  </div>

  <!-- New folder dialog -->
  <div id="folderModal" class="modal hidden">
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title">
          <h3 data-i18n="modals.newFolder">Yeni Klasör</h3>
        </div>
        <button class="modal-close" id="closeFolderModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="folderNameInput" data-i18n="modals.folderName">Klasör Adı</label>
          <input
            type="text"
            id="folderNameInput"
            class="form-input"
            data-i18n-placeholder="placeholders.folderName"
            placeholder="Klasör adını girin..."
            maxlength="50"
          />
        </div>
      </div>
      <div class="modal-footer">
        <button id="cancelFolderBtn" class="btn btn-secondary" data-i18n="buttons.cancel">
          İptal
        </button>
        <button id="createFolderBtn" class="btn btn-primary" data-i18n="buttons.create">
          Oluştur
        </button>
      </div>
    </div>
  </div>

  <!-- Note context menu (right-click on a note); labels are set when it opens -->
  <div id="noteContextMenu" class="context-menu menu hidden" role="menu">
    <button class="menu-item" data-action="favorite" role="menuitem">
      <i class="fas fa-heart tone-rose"></i>
      <span></span>
    </button>
    <button class="menu-item" data-action="pin" role="menuitem">
      <i class="fas fa-thumbtack tone-gold"></i>
      <span></span>
    </button>
    <button class="menu-item" data-action="lock" role="menuitem">
      <i class="fas fa-lock"></i>
      <span></span>
    </button>
    <button class="menu-item" data-action="duplicate" role="menuitem">
      <i class="fas fa-clone"></i>
      <span data-i18n="buttons.duplicate">Çoğalt</span>
    </button>
    <div class="menu-divider" role="separator"></div>
    <button class="menu-item menu-item-danger" data-action="delete" role="menuitem">
      <i class="fas fa-trash"></i>
      <span data-i18n="messages.deleteNote">Notu Sil</span>
    </button>
  </div>

  <!-- Menu for a selection of several notes and folders (Ctrl/Cmd+click) -->
  <div id="selectionMenu" class="context-menu menu hidden" role="menu">
    <button class="menu-item" data-action="favorite" role="menuitem">
      <i class="fas fa-heart tone-rose"></i>
      <span></span>
    </button>
    <button class="menu-item" data-action="pin" role="menuitem">
      <i class="fas fa-thumbtack tone-gold"></i>
      <span></span>
    </button>
    <button class="menu-item" data-action="duplicate" role="menuitem">
      <i class="fas fa-clone"></i>
      <span data-i18n="buttons.duplicate">Çoğalt</span>
    </button>
    <button class="menu-item" data-action="pinFolders" role="menuitem">
      <i class="fas fa-thumbtack tone-gold"></i>
      <span></span>
    </button>
    <button class="menu-item" data-action="unfile" role="menuitem">
      <i class="fas fa-folder-minus"></i>
      <span data-i18n="selection.unfile">Klasörden çıkar</span>
    </button>
    <div class="menu-divider" role="separator"></div>
    <button class="menu-item menu-item-danger" data-action="delete" role="menuitem">
      <i class="fas fa-trash"></i>
      <span></span>
    </button>
  </div>

  <!-- Folder context menu -->
  <div id="contextMenu" class="context-menu menu hidden" role="menu">
    <div class="menu-item" id="pinFolderMenuItem" role="menuitem">
      <i class="fas fa-thumbtack tone-gold"></i>
      <span></span>
    </div>
    <div class="menu-item" id="changeFolderColorMenuItem" role="menuitem">
      <i class="fas fa-palette"></i>
      <span data-i18n="modals.changeFolderColor">Klasör Rengini Değiştir</span>
    </div>
    <div class="menu-item" id="renameFolderMenuItem" role="menuitem">
      <i class="fas fa-pen"></i>
      <span data-i18n="modals.renameFolder">Yeniden Adlandır</span>
    </div>
    <div class="menu-divider" role="separator"></div>
    <div class="menu-item menu-item-danger" id="deleteFolderMenuItem" role="menuitem">
      <i class="fas fa-trash"></i>
      <span data-i18n="modals.deleteFolder">Klasörü Sil</span>
    </div>
  </div>

  <!-- Folder Color Modal (custom picker with Save) -->
  <div id="folderColorModal" class="modal hidden">
    <div class="modal-content modal-sm">
      <div class="modal-header">
        <div class="modal-title">
          <h3 data-i18n="modals.selectFolderColor">Klasör Rengi Seç</h3>
        </div>
        <button class="modal-close" id="closeFolderColorModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="folderColorInput" data-i18n="modals.color">Renk</label>
          <input type="color" id="folderColorInput" class="form-input form-color" />
        </div>
      </div>
      <div class="modal-footer">
        <button id="cancelFolderColorBtn" class="btn btn-secondary" data-i18n="buttons.cancel">
          İptal
        </button>
        <button id="saveFolderColorBtn" class="btn btn-primary" data-i18n="buttons.save">
          Kaydet
        </button>
      </div>
    </div>
  </div>
`;
