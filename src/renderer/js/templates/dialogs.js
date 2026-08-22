// Markup of the smaller dialogs and the folder context menu

export const NOTE_DIALOGS = /* HTML */ `
  <!-- Export Modal -->
  <div id="exportModal" class="modal hidden">
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fas fa-file-export" aria-hidden="true"></i>
          <h3 data-i18n="modals.exportNote">Notu Dışa Aktar</h3>
        </div>
        <button class="modal-close" id="closeExportModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="export-options">
        <button class="export-btn" data-type="txt">
          <i class="fas fa-file-alt"></i>
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

  <!-- Table modal -->
  <div id="tableModal" class="modal hidden">
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fas fa-table"></i>
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
        <div class="form-group">
          <label for="tableHeader"
            ><input id="tableHeader" type="checkbox" />
            <span data-i18n="modals.tableHeader">Başlık satırı ekle</span></label
          >
        </div>
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
    <div class="modal-content history-modal">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fas fa-clock-rotate-left" aria-hidden="true"></i>
          <h3 data-i18n="modals.noteHistory">Not Geçmişi</h3>
        </div>
        <button class="modal-close" id="closeHistoryModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body" id="historyBody">
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
    <div class="modal-content confirm-modal">
      <div class="confirm-icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <div class="confirm-text">
        <h3 data-i18n="modals.confirmAction">İşlemi Onayla</h3>
        <p id="confirmMessage" data-i18n="modals.confirmMessage">
          Bu işlemi gerçekleştirmek istediğinizden emin misiniz?
        </p>
      </div>
      <div class="modal-actions">
        <button id="cancelBtn" class="btn btn-secondary" data-i18n="buttons.cancel">İptal</button>
        <button id="confirmBtn" class="btn btn-danger" data-i18n="buttons.confirm">Onayla</button>
      </div>
      <button class="modal-close" id="closeConfirmModal">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>

  <!-- Password Modal -->
  <div id="passwordModal" class="modal hidden">
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="passwordModalTitle" data-i18n="modals.enterPassword">Şifre Girin</h3>
        <button class="modal-close" id="closePasswordModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div id="passwordMessage" class="form-message"></div>
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
    <div class="modal-content folder-modal">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fas fa-folder-plus"></i>
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

  <!-- Context Menu -->
  <div id="contextMenu" class="context-menu hidden">
    <div class="context-menu-item" id="changeFolderColorMenuItem">
      <i class="fas fa-palette"></i>
      <span data-i18n="modals.changeFolderColor">Klasör Rengini Değiştir</span>
    </div>
    <div class="context-menu-item" id="renameFolderMenuItem">
      <i class="fas fa-edit"></i>
      <span data-i18n="modals.renameFolder">Yeniden Adlandır</span>
    </div>
    <div class="context-menu-item" id="deleteFolderMenuItem">
      <i class="fas fa-trash"></i>
      <span data-i18n="modals.deleteFolder">Klasörü Sil</span>
    </div>
  </div>

  <!-- Folder Color Modal (custom picker with Save) -->
  <div id="folderColorModal" class="modal hidden">
    <div class="modal-content folder-color-modal">
      <div class="modal-header">
        <div class="modal-title">
          <i class="fas fa-palette"></i>
          <h3 data-i18n="modals.selectFolderColor">Klasör Rengi Seç</h3>
        </div>
        <button class="modal-close" id="closeFolderColorModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="folderColorInput" data-i18n="modals.color">Renk</label>
          <input type="color" id="folderColorInput" class="form-input" />
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
