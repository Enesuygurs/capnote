// An open HTML preview follows theme and accent changes

export async function run() {
  const a = window.app;
  a.createNewNote();
  a.noteTitle.value = 'P';
  a.richEditor.innerHTML = '<p>Hello <a href="https://x.y">link</a></p>';
  a.applyTheme(false);
  a.toggleHtmlMode();
  const frame = () => document.querySelector('iframe.preview-iframe');
  const light = {
    scheme: frame().style.colorScheme,
    color: /color:rgb\(([^)]*)\)/.exec(frame().srcdoc)?.[1],
  };
  a.applyTheme(true);
  const dark = {
    scheme: frame().style.colorScheme,
    color: /color:rgb\(([^)]*)\)/.exec(frame().srcdoc)?.[1],
    link: /a\{color:([^;]*);/.exec(frame().srcdoc)?.[1],
  };
  a.setAccentColor('#3b82f6', { persist: false });
  const accentLink = /a\{color:([^;]*);/.exec(frame().srcdoc)?.[1];
  a.toggleHtmlMode();
  const closedThenTheme = (a.applyTheme(false), frame()?.style.colorScheme);
  return { light, dark, accentLink, closedThenTheme, bodyKept: frame().srcdoc.includes('Hello') };
}

export const expected = {
  light: {
    scheme: 'light',
    color: '54, 54, 54',
  },
  dark: {
    scheme: 'dark',
    color: '230, 230, 230',
    link: 'color-mix(in srgb, #f59e0b 75%, white)',
  },
  accentLink: 'color-mix(in srgb, #3b82f6 75%, white)',
  closedThenTheme: 'dark',
  bodyKept: true,
};
