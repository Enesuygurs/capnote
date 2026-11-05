// Hardware acceleration is on by default; turning it off in the settings is saved and asks to
// restart, since it only applies when the app starts

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const toggle = document.getElementById('hardwareAccelerationToggle');
  const before = { setting: a.settings.hardwareAcceleration, checked: toggle.checked };

  toggle.checked = false;
  toggle.dispatchEvent(new Event('change'));
  await wait(200);
  const stored = (await window.electronAPI.storage.load()).data.settings.hardwareAcceleration;
  const asked = {
    open: !a.confirmModal.classList.contains('hidden'),
    message: document.getElementById('confirmMessage').textContent,
  };
  // Not now: the setting stays off for the next start
  a.hideModal(a.confirmModal);
  return { before, after: a.settings.hardwareAcceleration, stored, asked };
}

export const expected = {
  before: { setting: true, checked: true },
  after: false,
  stored: false,
  asked: { open: true, message: /yeniden başlatılsın mı/ },
};
