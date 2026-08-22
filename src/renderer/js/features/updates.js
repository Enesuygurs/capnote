// App version and updates, shown in the About tab of the settings

import { i18n } from '../i18n.js';

export class UpdatesFeature {
  async setupUpdates() {
    this.appVersionLabel = document.getElementById('appVersionLabel');
    this.updateStatusText = document.getElementById('updateStatusText');
    this.updateActionBtn = document.getElementById('updateActionBtn');
    const api = window.electronAPI;
    if (!api?.updates) return;

    const { version } = await api.appInfo();
    this.appVersion = version;
    this.updateState = await api.updates.state();
    this.renderUpdateState();

    api.updates.onStatus((state) => {
      // Tell the user once when an update has been downloaded
      if (state.status === 'ready' && this.updateState?.status !== 'ready') {
        this.showNotification(i18n.t('updates.readyToast', { version: state.version }), 'info');
      }
      this.updateState = state;
      this.renderUpdateState();
    });

    this.updateActionBtn?.addEventListener('click', async () => {
      if (this.updateState?.status === 'ready') {
        await api.updates.install();
        return;
      }
      this.updateState = await api.updates.check();
      this.renderUpdateState();
    });
  }

  // Also called when the language changes
  renderUpdateState() {
    if (this.appVersionLabel && this.appVersion) {
      this.appVersionLabel.textContent = `Capnote ${this.appVersion}`;
    }
    if (!this.updateStatusText || !this.updateActionBtn || !this.updateState) return;
    const { status, version } = this.updateState;
    this.updateStatusText.textContent = i18n.t(`updates.${status}`, { version });
    const ready = status === 'ready';
    this.updateActionBtn.hidden = status === 'unsupported';
    this.updateActionBtn.disabled = status === 'checking' || status === 'downloading';
    this.updateActionBtn.innerHTML = ready
      ? `<i class="fas fa-rotate-right"></i> ${i18n.t('updates.restart')}`
      : `<i class="fas fa-cloud-arrow-down"></i> ${i18n.t('updates.check')}`;
  }
}
