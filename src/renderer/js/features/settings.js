// Settings model, settings dialog, theme/accent and data reset actions

import { DEFAULT_ACCENT, DEFAULT_SETTINGS, LEGACY_SETTING_KEYS } from '../constants.js';
import { i18n } from '../i18n.js';

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
      autoSave: bool(get('settings.autoSave')),
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
      // Settings that no longer exist (e.g. the pin limit, delete confirmation) are dropped
      const known = Object.fromEntries(
        Object.entries(stored).filter(([key]) => key in DEFAULT_SETTINGS)
      );
      this.settings = { ...DEFAULT_SETTINGS, ...known };
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
    if (i18n.getLanguage() !== settings.language) {
      i18n.setLanguage(settings.language);
      window.electronAPI?.setLanguage?.(settings.language);
      this.updateDynamicTranslations?.();
    }
    this.currentSort = settings.noteSort;
    this.markSortOption(settings.noteSort);

    this.darkModeToggle.checked = settings.darkMode;
    this.applyTheme(settings.darkMode);
    // Without a saved accent the default one is in use, so its swatch shows as selected
    this.setAccentColor(settings.accentColor || DEFAULT_ACCENT, { persist: false });

    if (this.syncFolderAccentToggle)
      this.syncFolderAccentToggle.checked = settings.syncFolderAccent;
    // Ensure we apply or restore folder colors based on the stored preference.
    this.applyFolderAccentSync(settings.syncFolderAccent);

    if (this.toggleNativeNotifications)
      this.toggleNativeNotifications.checked = settings.nativeNotifications;
    if (this.onNoteDeleteSelect) this.onNoteDeleteSelect.value = settings.onNoteDelete;
    if (this.startupPageSelect) this.startupPageSelect.value = settings.startupPage;
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

    // On note delete behavior change
    if (this.startupPageSelect) {
      this.startupPageSelect.addEventListener('change', (e) => {
        this.setSetting('startupPage', e.target.value);
      });
    }

    if (this.onNoteDeleteSelect) {
      this.onNoteDeleteSelect.addEventListener('change', (e) => {
        this.setSetting('onNoteDelete', e.target.value);
      });
    }

    // Auto save toggle
    if (this.autoSaveToggle) {
      this.autoSaveToggle.addEventListener('change', (e) => {
        this.setSetting('autoSave', e.target.checked);
        const message = e.target.checked
          ? i18n.t('messages.autoSaveEnabled')
          : i18n.t('messages.autoSaveDisabled');
        this.showNotification(message, 'success');
      });
    }
  }

  setAccentColor(hex, options = { persist: true }) {
    if (!hex) return;
    // normalize hex to lowercase
    const color = hex.toLowerCase();
    // The stylesheet derives the transparent accent tints from these
    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--accent-color', color);

    if (options.persist !== false) this.setSetting('accentColor', color);
    // If sync option enabled, apply accent color to all folder icons
    if (this.settings.syncFolderAccent) this.applyFolderAccentSync(true);

    // Highlight the swatch of the selected color
    document.querySelectorAll('.swatch-btn').forEach((btn) => {
      btn.classList.toggle('active', (btn.dataset.color || '').toLowerCase() === color);
    });
    // Links in the HTML preview use the accent color
    this.refreshHtmlPreview();
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
      enabled ? i18n.t('messages.darkModeEnabled') : i18n.t('messages.lightModeEnabled'),
      'info'
    );
  }

  applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    this.refreshHtmlPreview();
  }

  testNativeNotification() {
    // Simple in-app notification + store
    const title = i18n.t('messages.testNotificationTitle');
    const body = i18n.t('messages.testNotificationBody');
    const nid = this.addNotification(null, title, 'test');
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
    this.showConfirm(i18n.t('messages.confirmDeleteAllNotes'), async () => {
      await this.clearAllNotes();
    });
  }

  confirmClearAllFolders() {
    this.showConfirm(i18n.t('messages.confirmDeleteAllFolders'), async () => {
      await this.clearAllFolders();
    });
  }

  confirmClearAllContent() {
    this.showConfirm(i18n.t('messages.confirmResetApp'), async () => {
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
      this.showNotification(i18n.t('messages.allNotesDeleted'), 'success');
    } catch (err) {
      console.error('Deleting all notes failed:', err);
      this.showNotification(i18n.t('messages.notesDeleteError'), 'error');
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
      this.showNotification(i18n.t('messages.allFoldersDeleted'), 'success');
    } catch (err) {
      console.error('Deleting all folders failed:', err);
      this.showNotification(i18n.t('messages.foldersDeleteError'), 'error');
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

      this.showNotification(i18n.t('messages.appReset'), 'success');
    } catch (err) {
      console.error('Resetting the app failed:', err);
      this.showNotification(i18n.t('messages.resetError'), 'error');
    }
  }

  // Controls in the settings dialog that apply immediately
  setupSettingsControls() {
    // Language selector
    if (this.languageSelect) {
      this.languageSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        if (i18n) {
          i18n.setLanguage(lang);
          this.setSetting('language', lang);
          window.electronAPI?.setLanguage?.(lang);
          this.showNotification(i18n.t('messages.languageChanged'), 'success');
          // Update dynamic content that may not have data-i18n attributes
          this.updateDynamicTranslations();
        }
      });
    }

    // Accent swatches
    this.accentYellowBtn?.addEventListener('click', (e) =>
      this.setAccentColor(e.currentTarget.dataset.color || '#f59e0b')
    );

    this.accentCherryBtn?.addEventListener('click', (e) =>
      this.setAccentColor(e.currentTarget.dataset.color || '#e11d48')
    );

    this.accentAppleBtn?.addEventListener('click', (e) =>
      this.setAccentColor(e.currentTarget.dataset.color || '#22c55e')
    );

    this.accentPurpleBtn?.addEventListener('click', (e) =>
      this.setAccentColor(e.currentTarget.dataset.color || '#8b5cf6')
    );

    this.accentBlueBtn?.addEventListener('click', (e) =>
      this.setAccentColor(e.currentTarget.dataset.color || '#3b82f6')
    );

    this.syncFolderAccentToggle?.addEventListener('change', (e) => {
      const enabled = e.currentTarget.checked;
      this.setSetting('syncFolderAccent', enabled);
      this.applyFolderAccentSync(enabled);
      this.updateFoldersList();
    });

    // Native/system notifications toggle
    this.toggleNativeNotifications?.addEventListener('change', (e) => {
      const enabled = e.currentTarget.checked;
      this.setSetting('nativeNotifications', enabled);
      this.showNotification(
        enabled
          ? i18n.t('messages.systemNotificationsEnabled')
          : i18n.t('messages.systemNotificationsDisabled'),
        'success'
      );
    });

    // Start at login toggle
    this.startAtLoginToggle?.addEventListener('change', async (e) => {
      try {
        const enabled = !!e.currentTarget.checked;
        if (window.electronAPI && typeof window.electronAPI.setStartAtLogin === 'function') {
          const res = await window.electronAPI.setStartAtLogin(enabled);
          if (!res || res.ok !== true)
            throw new Error(res && res.error ? res.error : 'Bilinmeyen hata');
          this.showNotification(
            enabled
              ? i18n.t('messages.launchOnStartupEnabled')
              : i18n.t('messages.launchOnStartupDisabled'),
            'success'
          );
        }
      } catch (err) {
        console.warn('setStartAtLogin failed:', err);
        // revert checkbox
        if (this.startAtLoginToggle)
          this.startAtLoginToggle.checked = !this.startAtLoginToggle.checked;
        this.showNotification(i18n.t('messages.launchOnStartupError'), 'error');
      }
    });

    // Close to tray toggle: only wire on Windows (hide on macOS/Linux)
    try {
      const plat =
        window.electronAPI && window.electronAPI.platform
          ? window.electronAPI.platform
          : (navigator.platform || '').toLowerCase();
      if (plat === 'win32' && this.closeToTrayToggle) {
        this.closeToTrayToggle.addEventListener('change', async (e) => {
          try {
            const enabled = !!e.currentTarget.checked;
            if (window.electronAPI && typeof window.electronAPI.setCloseToTray === 'function') {
              const res = await window.electronAPI.setCloseToTray(enabled);
              this.setSetting('closeToTray', enabled);
              if (!res || res.ok !== true)
                throw new Error(res && res.error ? res.error : 'Bilinmeyen hata');
              this.showNotification(
                enabled
                  ? i18n.t('messages.minimizeToTrayEnabled')
                  : i18n.t('messages.minimizeToTrayDisabled'),
                'success'
              );
            }
          } catch (err) {
            console.warn('setCloseToTray failed:', err);
            if (this.closeToTrayToggle)
              this.closeToTrayToggle.checked = !this.closeToTrayToggle.checked;
            this.showNotification(i18n.t('messages.minimizeToTrayError'), 'error');
          }
        });
      } else {
        // hide the close-to-tray UI on non-Windows: find nearest .setting-item container
        try {
          if (this.closeToTrayToggle) {
            let el = this.closeToTrayToggle;
            while (el && !el.classList.contains('setting-item')) el = el.parentElement;
            if (el) el.style.display = 'none';
          }
        } catch (hideErr) {}
      }
    } catch (err) {
      // ignore
    }

    // Test notification button (with cooldown)
    this.testNativeNotifBtn?.addEventListener('click', () => this.handleTestNotificationClick());
  }
}
