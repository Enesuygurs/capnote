// No content security violations; icons, fonts and translations load from local files

export async function run() {
  const a = window.app;
  const violations = [];
  document.addEventListener('securitypolicyviolation', (e) =>
    violations.push(e.violatedDirective + ' ' + e.blockedURI)
  );
  await document.fonts.ready;
  a.createNewNote();
  a.noteTitle.value = 'CSP';
  a.richEditor.innerHTML =
    '<p>&lt;div style="color:red"&gt;red&lt;/div&gt;</p><pre><code>x</code></pre>';
  a.saveNote();
  await a.editCurrentNote();
  a.toggleHtmlMode();
  await new Promise((r) => setTimeout(r, 400));
  const iframe = a.htmlPreview.querySelector('iframe');
  a.toggleHtmlMode();
  a.toggleMarkdownMode();
  a.toggleMarkdownMode();
  a.showSettingsModal();
  await new Promise((r) => setTimeout(r, 200));
  return {
    violations,
    csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
    iframe: !!iframe,
    faIcon: getComputedStyle(document.querySelector('.fa-gear'), '::before').fontFamily,
    inter: document.fonts.check('16px Inter'),
    translations: (await import(new URL('js/i18n.js', location.href).href)).i18n.t('nav.notes'),
  };
}

export const expected = {
  violations: [],
  csp: true,
  iframe: true,
  faIcon: '"Font Awesome 7 Free"',
  inter: true,
  translations: 'Notlar',
};
