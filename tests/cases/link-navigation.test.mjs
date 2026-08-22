// Links in notes open outside the app; the window never navigates away

export async function run() {
  const a = window.app;
  const startUrl = location.href;
  a.createNewNote();
  a.noteTitle.value = 'Links';
  a.richEditor.innerHTML =
    '<p><a id="l1" href="https://example.com">same tab</a> <a id="l2" href="https://example.org" target="_blank">new tab</a></p>';
  a.saveNote();
  a.viewerText.querySelector('#l1').click();
  await new Promise((r) => setTimeout(r, 500));
  a.viewerText.querySelector('#l2').click();
  await new Promise((r) => setTimeout(r, 500));
  return { stillOnApp: location.href === startUrl, appAlive: !!window.app };
}

export const expected = {
  stillOnApp: true,
  appAlive: true,
};
