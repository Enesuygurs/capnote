// Settings model, settings dialog, theme/accent and data reset actions

import { DEFAULT_ACCENT, DEFAULT_SETTINGS, LEGACY_SETTING_KEYS } from '../constants.js';

export class SettingsFeature {
  readLegacySettings() {
    const get = (key) => localStorage.getItem(key);
    const bool = (value) => (value === null ? undefined : value === 'true' || value === '1');
    let folderColorsBackup;
    try {
      folderColorsBackup = get('folderColorsBackup')
        ? JSON.parse(get('folderColorsBackup'))
        : undefined;
    } catch {
      folderColorsBackup = undefined;
    }
    const legacy = {
      language: get('app-language') || undefined,
      darkMode: bool(get('darkMode')),
      accentColor: get('accentColor') || undefined,
      syncFolderAccent: bool(get('syncFolderAccent')),
      folderColorsBackup,
      maxPinnedNotes: parseInt(get('maxPinnedNotes'), 10) || undefined,
      autoSave: bool(get('settings.autoSave')),
      confirmDelete: bool(get('settings.confirmDelete')),
      onNoteDelete: get('settings.onNoteDelete') || undefined,
      nativeNotifications: bool(get('settings.nativeNotifications')),
      editorSidebarVisible: bool(get('editorSidebarVisible')),
      lastViewedNoteId: get('last-viewed-note') || undefined,
    };
    Object.keys(legacy).forEach((key) => legacy[key] === undefined && delete legacy[key]);
    return legacy;
  }

  async loadSettingsData() {
    const stored = this.storedData.settings;
    if (stored && typeof stored === 'object') {
      this.settings = { ...DEFAULT_SETTINGS, ...stored };
      return;
    }
    // First launch with settings in the file storage: take over the old values
    const closeToTray = await window.electronAPI.getCloseToTray().catch(() => null);
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...this.readLegacySettings(),
      ...(closeToTray && typeof closeToTray.enabled === 'boolean'
        ? { closeToTray: closeToTray.enabled }
        : {}),
    };
    await this.persist('settings', this.settings);
    LEGACY_SETTING_KEYS.forEach((key) => localStorage.removeItem(key));
  }

  setSetting(key, value) {
    this.settings[key] = value;
    this.persist('settings', this.settings);
  }

  showSettingsModal() {
    this.showModal(this.settingsModal);
  }

  loadSettings() {
    const settings = this.settings;
    if (this.languageSelect) this.languageSelect.value = settings.language;

    this.darkModeToggle.checked = settings.darkMode;
    this.applyTheme(settings.darkMode);
    if (settings.accentColor) this.setAccentColor(settings.accentColor, { persist: false });

    if (this.syncFolderAccentToggle)
      this.syncFolderAccentToggle.checked = settings.syncFolderAccent;
    // Ensure we apply or restore folder colors based on the stored preference.
    this.applyFolderAccentSync(settings.syncFolderAccent);

    if (this.toggleNativeNotifications)
      this.toggleNativeNotifications.checked = settings.nativeNotifications;
    if (this.maxPinnedSelect) this.maxPinnedSelect.value = String(settings.maxPinnedNotes);
    if (this.onNoteDeleteSelect) this.onNoteDeleteSelect.value = settings.onNoteDelete;
    if (this.confirmDeleteToggle) this.confirmDeleteToggle.checked = settings.confirmDelete;
    if (this.autoSaveToggle) this.autoSaveToggle.checked = settings.autoSave;
    if (this.closeToTrayToggle) this.closeToTrayToggle.checked = settings.closeToTray;

    // Query start-at-login from main (async, best-effort)
    try {
      if (
        this.startAtLoginToggle &&
        window.electronAPI &&
        typeof window.electronAPI.getStartAtLogin === 'function'
      ) {
        window.electronAPI
          .getStartAtLogin()
          .then((res) => {
            if (res && typeof res.enabled === 'boolean')
              this.startAtLoginToggle.checked = !!res.enabled;
          })
          .catch(() => {});
      }
    } catch {}

    // Keep the main process in sync with the stored close-to-tray preference
    window.electronAPI?.setCloseToTray?.(settings.closeToTray);
  }

  setupSettingsEventListeners() {
    // Settings tab switching
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const settingsTabContents = document.querySelectorAll('.settings-tab-content');

    settingsTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // Remove active class from all tabs and contents
        settingsTabs.forEach((t) => t.classList.remove('active'));
        settingsTabContents.forEach((c) => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const targetContent = document.querySelector(
          `.settings-tab-content[data-content="${targetTab}"]`
        );
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });

    // Max pinned notes change
    if (this.maxPinnedSelect) {
      this.maxPinnedSelect.addEventListener('change', (e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v >= 3 && v <= 10) {
          this.setSetting('maxPinnedNotes', v);
          this.showNotification(window.i18n.t('messages.pinnedLimitUpdated'), 'success');
        }
      });
    }

    // On note delete behavior change
    if (this.onNoteDeleteSelect) {
      this.onNoteDeleteSelect.addEventListener('change', (e) => {
        this.setSetting('onNoteDelete', e.target.value);
      });
    }

    // Confirm delete toggle
    if (this.confirmDeleteToggle) {
      this.confirmDeleteToggle.addEventListener('change', (e) => {
        this.setSetting('confirmDelete', e.target.checked);
      });
    }

    // Auto save toggle
    if (this.autoSaveToggle) {
      this.autoSaveToggle.addEventListener('change', (e) => {
        this.setSetting('autoSave', e.target.checked);
        const message = e.target.checked
          ? window.i18n.t('messages.autoSaveEnabled')
          : window.i18n.t('messages.autoSaveDisabled');
        this.showNotification(message, 'success');
      });
    }
  }

  setAccentColor(hex, options = { persist: true }) {
    if (!hex) return;
    // normalize hex to lowercase
    const color = hex.toLowerCase();
    // apply primary-ish variable and accent variable
    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--accent-color', color);

    // derive some rgba variants for existing rules that expect alpha variants
    // naive conversion for the common yellow used previously (245,158,11)
    // we'll generate rgba using a small helper to convert hex -> r,g,b
    function hexToRgb(h) {
      const hex = h.replace('#', '');
      const bigint = parseInt(
        hex.length === 3
          ? hex
              .split('')
              .map((c) => c + c)
              .join('')
          : hex,
        16
      );
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return [r, g, b];
    }
    const [r, g, b] = hexToRgb(color);
    document.documentElement.style.setProperty(
      '--accent-color-rgba-15',
      `rgba(${r}, ${g}, ${b}, 0.15)`
    );
    document.documentElement.style.setProperty(
      '--accent-color-rgba-20',
      `rgba(${r}, ${g}, ${b}, 0.2)`
    );
    document.documentElement.style.setProperty(
      '--accent-color-rgba-30',
      `rgba(${r}, ${g}, ${b}, 0.3)`
    );
    document.documentElement.style.setProperty(
      '--accent-color-rgba-18',
      `rgba(${r}, ${g}, ${b}, 0.18)`
    );
    document.documentElement.style.setProperty(
      '--accent-color-rgba-10',
      `rgba(${r}, ${g}, ${b}, 0.10)`
    );
    document.documentElement.style.setProperty(
      '--accent-color-rgba-12',
      `rgba(${r}, ${g}, ${b}, 0.12)`
    );

    if (options.persist !== false) this.setSetting('accentColor', color);
    // If sync option enabled, apply accent color to all folder icons
    if (this.settings.syncFolderAccent) this.applyFolderAccentSync(true);

    // update active state on swatch buttons so the selected one appears larger
    try {
      const allSwatches = Array.from(document.querySelectorAll('.swatch-btn'));
      allSwatches.forEach((btn) => {
        try {
          const btnColor = (btn.dataset.color || '').toLowerCase();
          if (btnColor && btnColor === color) btn.classList.add('active');
          else btn.classList.remove('active');
        } catch (e) {
          /* noop for individual button */
        }
      });
    } catch (e) {
      // non-fatal
    }
  }

  applyFolderAccentSync(enabled) {
    // If enabled, set every folder color to the current accent color
    if (!this.folders) return;
    if (enabled) {
      // Save backup of original colors if not already saved
      if (!this.settings.folderColorsBackup) {
        const backup = {};
        this.folders.forEach((f) => {
          backup[f.id] = f.color;
        });
        this.setSetting('folderColorsBackup', backup);
      }

      const accent =
        this.settings.accentColor ||
        getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() ||
        '#f59e0b';
      this.folders = this.folders.map((f) => ({ ...f, color: accent }));
    } else {
      // Restore from backup if available
      const backup = this.settings.folderColorsBackup;
      if (backup) {
        this.folders = this.folders.map((f) => ({ ...f, color: backup[f.id] || f.color }));
        // Remove backup after restore
        this.setSetting('folderColorsBackup', null);
      }
    }

    // Persist changes and refresh UI
    this.saveFolders();
    this.updateFoldersList();
    // Make sure folder notes are repopulated after DOM rebuild
    this.updateFolderNotes();
  }

  toggleDarkMode(enabled) {
    this.applyTheme(enabled);
    this.setSetting('darkMode', enabled);
    this.showNotification(
      enabled
        ? window.i18n.t('messages.darkModeEnabled')
        : window.i18n.t('messages.lightModeEnabled'),
      'info'
    );
  }

  applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  testNativeNotification() {
    // Simple in-app notification + store
    const title = window.i18n.t('messages.testNotificationTitle');
    const body = window.i18n.t('messages.testNotificationBody');
    const nid = this.addNotification(null, title, body);
    this.showNotification(title, 'info', { notificationId: nid });

    // Fire native notification if preference enabled
    try {
      const nativePref = this.settings.nativeNotifications;
      if (
        nativePref &&
        window &&
        window.electronAPI &&
        typeof window.electronAPI.showNativeNotification === 'function'
      ) {
        window.electronAPI
          .showNativeNotification({
            title,
            body,
            silent: false,
          })
          .catch((err) => console.warn('showNativeNotification rejected:', err));
      }
    } catch (err) {
      console.warn('Native notification test error:', err);
    }
  }

  handleTestNotificationClick() {
    if (!this.testNativeNotifBtn) return;
    // Prevent rapid repeated clicks: disable for 3 seconds
    if (this._testNotifCooldown) return;
    this._testNotifCooldown = true;
    this.testNativeNotifBtn.disabled = true;
    // visually indicate disabled state (button styles handle disabled)
    try {
      this.testNativeNotification();
    } catch (err) {
      console.warn('Error firing test notification', err);
    }
    setTimeout(() => {
      this.testNativeNotifBtn.disabled = false;
      this._testNotifCooldown = false;
    }, 3000);
  }

  confirmClearAllNotes() {
    this.showConfirm(window.i18n.t('messages.confirmDeleteAllNotes'), async () => {
      await this.clearAllNotes();
    });
  }

  confirmClearAllFolders() {
    this.showConfirm(window.i18n.t('messages.confirmDeleteAllFolders'), async () => {
      await this.clearAllFolders();
    });
  }

  confirmClearAllContent() {
    this.showConfirm(window.i18n.t('messages.confirmResetApp'), async () => {
      await this.clearAllContent();
    });
  }

  async clearAllNotes() {
    try {
      const removedNoteIds = (this.notes || []).map((n) => n.id);

      this.notes = [];
      this.currentNote = null;
      this.unlockedNotes.clear();
      await this.saveNotes();
      this.removeNoteReferences(removedNoteIds);
      // Clear last viewed note
      this.setSetting('lastViewedNoteId', null);
      this.updateNotesList();
      this.updateFoldersList();
      this.updateStats();
      this.showWelcome();
      this.showNotification(window.i18n.t('messages.allNotesDeleted'), 'success');
    } catch (err) {
      console.error('Tüm notlar silinirken hata:', err);
      this.showNotification(window.i18n.t('messages.notesDeleteError'), 'error');
    }
  }

  async clearAllFolders() {
    try {
      // Removing folders keeps the notes: they simply become folderless
      const now = new Date().toISOString();
      (this.notes || []).forEach((n) => {
        if (n.folderId) {
          n.folderId = null;
          n.updatedAt = now;
        }
      });
      this.folders = [];

      await this.saveNotes();
      await this.saveFolders();

      this.updateNotesList();
      this.updateFoldersList();
      this.updateStats();
      this.showNotification(window.i18n.t('messages.allFoldersDeleted'), 'success');
    } catch (err) {
      console.error('Tüm klasörler silinirken hata:', err);
      this.showNotification(window.i18n.t('messages.foldersDeleteError'), 'error');
    }
  }

  async clearAllContent() {
    try {
      // Every collection, including todos, goes back to empty
      this.notes = [];
      this.folders = [];
      this.reminders = [];
      this.notifications = [];
      this.todoSections = [];
      this.currentNote = null;
      this.unlockedNotes.clear();

      // Settings go back to defaults, keeping the UI language
      this.settings = { ...DEFAULT_SETTINGS, language: this.settings.language };

      await Promise.all([
        this.saveNotes(),
        this.saveFolders(),
        this.saveReminders(),
        this.saveNotifications(),
        this.saveTodos(),
        this.persist('settings', this.settings),
      ]);

      // Undo the inline accent colour, then reflect the defaults everywhere
      this.setAccentColor(DEFAULT_ACCENT, { persist: false });
      this.loadSettings();
      this.loadSidebarPreference();

      this.updateNotesList();
      this.updateFoldersList();
      this.updateRemindersView();
      this.updateNotificationsView();
      this.renderTodosSections();
      this.updateTodosCount();
      this.updateActiveRemindersCount();
      this.updateActiveNotificationsCount();
      this.updateStats();
      this.showWelcome();

      this.showNotification(window.i18n.t('messages.appReset'), 'success');
    } catch (err) {
      console.error('Tüm içerik silinirken hata:', err);
      this.showNotification(window.i18n.t('messages.resetError'), 'error');
    }
  }
}
