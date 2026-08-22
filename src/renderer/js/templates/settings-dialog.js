// Markup of the settings dialog and its tabs

export const SETTINGS_DIALOG = /* HTML */ `
  <!-- Settings Modal -->
  <div id="settingsModal" class="modal hidden">
    <div class="modal-content settings-modal">
      <div class="modal-header">
        <h3><i class="fas fa-cog"></i> <span data-i18n="nav.settings">Ayarlar</span></h3>
        <button class="modal-close" id="closeSettingsModal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="settings-body">
        <!-- Vertical Tabs -->
        <div class="settings-tabs">
          <button class="settings-tab active" data-tab="general">
            <i class="fas fa-cog"></i>
            <span data-i18n="sections.general">Genel</span>
          </button>
          <button class="settings-tab" data-tab="appearance">
            <i class="fas fa-palette"></i>
            <span data-i18n="sections.appearance">Görünüm</span>
          </button>
          <button class="settings-tab" data-tab="notifications">
            <i class="fas fa-bell"></i>
            <span data-i18n="sections.notifications">Bildirimler</span>
          </button>
          <button class="settings-tab" data-tab="system">
            <i class="fas fa-desktop"></i>
            <span data-i18n="sections.system">Sistem</span>
          </button>
          <button class="settings-tab" data-tab="data">
            <i class="fas fa-database"></i>
            <span data-i18n="sections.dataManagement">Veri Yönetimi</span>
          </button>
          <button class="settings-tab" data-tab="about">
            <i class="fas fa-info-circle"></i>
            <span data-i18n="sections.about">Hakkında</span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="settings-content">
          <!-- General Tab -->
          <div class="settings-tab-content active" data-content="general">
            <h4><i class="fas fa-cog"></i> <span data-i18n="sections.general">Genel</span></h4>

            <div class="settings-subsection">
              <h5>
                <i class="fas fa-file-alt"></i>
                <span data-i18n="sections.noteSettings">Not Ayarları</span>
              </h5>
              <div class="setting-item">
                <div class="setting-info">
                  <label data-i18n="settings.onNoteDelete">Not silindiğinde</label>
                  <small data-i18n="settings.onNoteDeleteDesc"
                    >Not silindiğinde ne olacağını seç</small
                  >
                </div>
                <select id="onNoteDeleteSelect" class="select-small">
                  <option value="lastNote" data-i18n="settings.openLastNote">
                    Son kalan notu aç
                  </option>
                  <option value="home" data-i18n="settings.openHome">Ana sayfa bölümünü aç</option>
                </select>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <label data-i18n="settings.confirmDelete">Silme işleminde onay iste</label>
                  <small data-i18n="settings.confirmDeleteDesc"
                    >Notları silerken onay ekranı göster</small
                  >
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="confirmDeleteToggle" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <label data-i18n="settings.maxPinnedNotes">Sabit Not Sayısı</label>
                  <small data-i18n="settings.maxPinnedNotesDesc"
                    >En fazla kaç not sabitlenebilsin (3 - 10)</small
                  >
                </div>
                <select id="maxPinnedSelect" class="select-small">
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                </select>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <label data-i18n="settings.autoSave">Otomatik Kaydetme</label>
                  <small data-i18n="settings.autoSaveDesc"
                    >Notları yazarken otomatik olarak kaydet</small
                  >
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" id="autoSaveToggle" checked />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="settings-subsection">
              <h5>
                <i class="fas fa-language"></i> <span data-i18n="sections.language">Dil</span>
              </h5>
              <div class="setting-item">
                <div class="setting-info">
                  <label data-i18n="settings.language">Dil</label>
                  <small data-i18n="settings.languageDesc">Uygulama dilini değiştir</small>
                </div>
                <select id="languageSelect" class="select-small">
                  <option value="tr">Türkçe</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Appearance Tab -->
          <div class="settings-tab-content" data-content="appearance">
            <h4>
              <i class="fas fa-palette"></i> <span data-i18n="sections.appearance">Görünüm</span>
            </h4>
            <div class="setting-item">
              <div class="setting-info">
                <label data-i18n="settings.darkMode">Karanlık Mod</label>
                <small data-i18n="settings.darkModeDesc">Gözlerinizi yormasın</small>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="darkModeToggle" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label data-i18n="settings.accentColor">Vurgu Rengi</label>
                <small data-i18n="settings.accentColorDesc">Vurgu renklerini değiştirin</small>
              </div>
              <div class="theme-swatches">
                <button
                  class="swatch-btn"
                  id="accentYellow"
                  data-i18n-title="titles.yellow"
                  data-i18n-aria-label="titles.yellow"
                  data-color="#f59e0b"
                ></button>
                <button
                  class="swatch-btn"
                  id="accentCherry"
                  data-i18n-title="titles.cherryRed"
                  data-i18n-aria-label="titles.cherryRed"
                  data-color="#e11d48"
                ></button>
                <button
                  class="swatch-btn"
                  id="accentApple"
                  data-i18n-title="titles.appleGreen"
                  data-i18n-aria-label="titles.appleGreen"
                  data-color="#22c55e"
                ></button>
                <button
                  class="swatch-btn"
                  id="accentPurple"
                  data-i18n-title="titles.purple"
                  data-i18n-aria-label="titles.purple"
                  data-color="#8b5cf6"
                ></button>
                <button
                  class="swatch-btn"
                  id="accentBlue"
                  data-i18n-title="titles.blue"
                  data-i18n-aria-label="titles.blue"
                  data-color="#3b82f6"
                ></button>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label data-i18n="settings.syncFolderAccent"
                  >Vurgu rengini klasör rengiyle eşitle</label
                >
                <small data-i18n="settings.syncFolderAccentDesc"
                  >Tüm klasör ikon renklerini vurgu rengine ayarla</small
                >
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="syncFolderAccentToggle" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <!-- Notifications Tab -->
          <div class="settings-tab-content" data-content="notifications">
            <h4>
              <i class="fas fa-bell"></i>
              <span data-i18n="sections.notifications">Bildirimler</span>
            </h4>
            <div class="setting-item">
              <div class="setting-info">
                <label data-i18n="settings.systemNotifications">Sistem bildirimleri</label>
                <small data-i18n="settings.systemNotificationsDesc"
                  >Hatırlatmalar için işletim sistemi bildirimlerini göster</small
                >
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="toggleNativeNotifications" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label data-i18n="settings.testNotification">Test bildirimi gönder</label>
                <small data-i18n="settings.testNotificationDesc"
                  >Hemen bir test bildirimi göster</small
                >
              </div>
              <button type="button" id="testNativeNotifBtn" class="btn btn-primary btn-small">
                <i class="fas fa-bell"></i>
                <span data-i18n="buttons.testNotifications">Bildirimleri test et</span>
              </button>
            </div>
          </div>

          <!-- System Tab -->
          <div class="settings-tab-content" data-content="system">
            <h4><i class="fas fa-desktop"></i> <span data-i18n="sections.system">Sistem</span></h4>
            <div class="setting-item">
              <div class="setting-info">
                <label data-i18n="settings.startAtLogin">Başlangıçta çalıştır</label>
                <small data-i18n="settings.startAtLoginDesc"
                  >Oturum açıldığında Capnote arka planda başlasın</small
                >
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="startAtLoginToggle" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label data-i18n="settings.closeToTray">Pencereyi kapatınca tepsiye küçült</label>
                <small data-i18n="settings.closeToTrayDesc"
                  >Kapat düğmesine basınca uygulama sistem tepsisinde çalışmaya devam etsin</small
                >
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="closeToTrayToggle" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <!-- Data Management Tab -->
          <div class="settings-tab-content" data-content="data">
            <h4>
              <i class="fas fa-database"></i>
              <span data-i18n="sections.dataManagement">Veri Yönetimi</span>
            </h4>

            <div class="settings-subsection">
              <h5>
                <i class="fas fa-exchange-alt"></i>
                <span data-i18n="sections.dataImportExport">Verileri İçe/Dışa Aktar</span>
              </h5>
              <div class="setting-item">
                <div class="setting-info">
                  <label data-i18n="settings.importData">Verileri İçe Aktar</label>
                  <small data-i18n="settings.importDataDesc"
                    >JSON dosyasından tüm verileri (notlar, klasörler, hatırlatmalar, bildirimler,
                    ayarlar) içe aktarın</small
                  >
                </div>
                <button id="importAllDataBtn" class="btn-outline btn-small">
                  <i class="fas fa-upload"></i> <span data-i18n="buttons.import">İçe Aktar</span>
                </button>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <label data-i18n="settings.exportData">Verileri Dışa Aktar</label>
                  <small data-i18n="settings.exportDataDesc"
                    >Tüm verilerin bir yedeğini JSON olarak dışa aktarın</small
                  >
                </div>
                <button id="exportAllDataBtn" class="btn-outline btn-small">
                  <i class="fas fa-download"></i>
                  <span data-i18n="buttons.export">Dışa Aktar</span>
                </button>
              </div>
            </div>

            <div class="settings-subsection">
              <h5>
                <i class="fas fa-trash"></i>
                <span data-i18n="sections.clearData">Verileri Temizle</span>
              </h5>
              <div class="setting-item">
                <div class="setting-info">
                  <label data-i18n="settings.deleteAllNotes">Tüm Notları Sil</label>
                  <small data-i18n="settings.deleteAllNotesDesc"
                    >Tüm kayıtlı notlarınızı kalıcı olarak siler</small
                  >
                </div>
                <button id="clearAllNotesBtn" class="btn-outline btn-small btn-danger">
                  <i class="fas fa-trash-alt"></i>
                  <span data-i18n="settings.deleteAllNotes">Tüm Notları Sil</span>
                </button>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <label data-i18n="settings.deleteAllFolders">Tüm Klasörleri Sil</label>
                  <small data-i18n="settings.deleteAllFoldersDesc"
                    >Tüm klasörleri ve klasör ilişkilerini kaldırır</small
                  >
                </div>
                <button id="clearAllFoldersBtn" class="btn-outline btn-small btn-danger">
                  <i class="fas fa-folder-minus"></i>
                  <span data-i18n="settings.deleteAllFolders">Tüm Klasörleri Sil</span>
                </button>
              </div>
              <div class="setting-item">
                <div class="setting-info">
                  <label data-i18n="settings.resetApp">Uygulamayı Sıfırla</label>
                  <small data-i18n="settings.resetAppDesc"
                    >Notlar, klasörler ve ayarlar dahil uygulamayı varsayılan haline döndürür</small
                  >
                </div>
                <button id="clearAllContentBtn" class="btn-outline btn-small btn-danger">
                  <i class="fas fa-eraser"></i>
                  <span data-i18n="settings.resetApp">Uygulamayı Sıfırla</span>
                </button>
              </div>
            </div>
          </div>

          <!-- About Tab -->
          <div class="settings-tab-content" data-content="about">
            <h4>
              <i class="fas fa-info-circle"></i> <span data-i18n="sections.about">Hakkında</span>
            </h4>
            <div class="setting-item">
              <div class="setting-info">
                <label>GitHub</label>
                <small>github.com/Enesuygurs/capnote</small>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-info">
                <label data-i18n="settings.versionLabel">Versiyon</label>
                <small data-i18n="app.version">Capnote v1.0.0</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
