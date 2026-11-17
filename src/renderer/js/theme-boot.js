// Runs before the page is first drawn (a plain script in <head>, not a module): the theme and the
// accent from the address the main process opened the window with, so a dark app never shows
// light for a moment while its settings load. The settings apply the same values again later.
(function applyBootTheme() {
  const params = new URLSearchParams(window.location.search);
  const root = document.documentElement;
  if (params.get('theme') === 'dark') root.setAttribute('data-theme', 'dark');
  const accent = params.get('accent');
  if (/^#[0-9a-f]{6}$/i.test(accent || '')) {
    root.style.setProperty('--accent-color', accent);
    root.style.setProperty('--primary-color', accent);
  }
})();
