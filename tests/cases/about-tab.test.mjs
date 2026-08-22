// The About tab shows the version and, outside the installed app, that updates are not available

export async function run() {
  const a = window.app;
  await new Promise((r) => setTimeout(r, 300));
  const read = () => ({
    version: a.appVersionLabel.textContent,
    status: a.updateStatusText.textContent,
    buttonHidden: getComputedStyle(a.updateActionBtn).display === 'none',
  });
  const tr = read();
  a.languageSelect.value = 'en';
  a.languageSelect.dispatchEvent(new Event('change'));
  await new Promise((r) => setTimeout(r, 200));
  return { tr, en: read() };
}

export const expected = {
  tr: {
    version: /^Capnote \d+\.\d+\.\d+$/,
    status: "Güncellemeler Windows ve Linux'ta yüklü uygulamada otomatik kurulur",
    buttonHidden: true,
  },
  en: {
    version: /^Capnote \d+\.\d+\.\d+$/,
    status: 'Updates are installed automatically in the installed app on Windows and Linux',
    buttonHidden: true,
  },
};
