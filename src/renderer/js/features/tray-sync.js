// The tray menu (main process, tray.js) shows the app's theme and the notes edited last. The page
// tells it both, only when they change: after the notes or a setting are saved. A locked note is
// never in the list (its title would show outside the lock); archived ones are left out too.
// Choosing a note there opens it here.

const TRAY_RECENT = 5;

export class TraySyncFeature {
  trayState() {
    const recent = this.notes
      .filter((n) => !n.isLocked && !n.isArchived)
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
      .slice(0, TRAY_RECENT)
      .map((n) => ({ id: n.id, title: this.displayTitle(n) }));
    return { dark: !!this.settings?.darkMode, recent };
  }

  syncTray() {
    const api = window.electronAPI;
    if (!api?.trayState || !Array.isArray(this.notes)) return;
    const state = this.trayState();
    const key = JSON.stringify(state);
    if (key === this.lastTrayState) return;
    this.lastTrayState = key;
    api.trayState(state);
  }

  setupTraySync() {
    window.electronAPI?.onOpenNoteFromTray?.((id) => {
      const note = this.notes.find((n) => String(n.id) === String(id));
      if (note) this.selectNote(note);
    });
    this.syncTray();
  }
}
