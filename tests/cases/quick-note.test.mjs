// The quick note shortcut (Ctrl+Alt+N from anywhere) is on at start and the settings turn it off
// and on. When another app holds the keys the switch goes back off and says so.

export async function run() {
  const a = window.app;
  const api = window.electronAPI;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const toggle = a.quickNoteShortcutToggle;
  const atStart = { setting: a.settings.quickNoteShortcut, switchOn: toggle.checked };

  toggle.checked = false;
  toggle.dispatchEvent(new Event('change'));
  await wait(200);
  const off = {
    registered: (await api.getQuickNoteShortcut()).enabled,
    saved: a.settings.quickNoteShortcut,
  };

  toggle.checked = true;
  toggle.dispatchEvent(new Event('change'));
  await wait(200);
  const registered = (await api.getQuickNoteShortcut()).enabled;
  // Either the keys were free and it is on, or they are taken and the switch went back off
  const consistent = registered
    ? toggle.checked && a.settings.quickNoteShortcut === true
    : !toggle.checked && a.settings.quickNoteShortcut === false;
  return { atStart, off, consistent };
}

export const expected = {
  atStart: { setting: true, switchOn: true },
  off: { registered: false, saved: false },
  consistent: true,
};
