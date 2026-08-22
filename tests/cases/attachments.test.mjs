// Picked files are copied into the uploads folder and inserted; files without a path are refused

export async function run() {
  // Gets a real File for a path on disk by filling a hidden <input type=file> through the harness
  const pickFile = (p) =>
    new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'pick' + Math.random().toString(36).slice(2);
      input.hidden = true;
      document.body.appendChild(input);
      input.addEventListener(
        'change',
        () => {
          resolve(input.files[0]);
          input.remove();
        },
        { once: true }
      );
      console.log('__PICK__:' + JSON.stringify(['#' + input.id, p]));
    });
  const api = window.electronAPI;
  const a = window.app;
  const icon = location.href.replace(
    /src\/renderer\/index\.html.*$/,
    'assets/icons/capnote-32.png'
  );
  const iconPath = decodeURIComponent(new URL(icon).pathname).replace(/^\/([A-Za-z]:)/, '$1');
  const ok = await api.saveDroppedFile(await pickFile(iconPath));
  const img = new Image();
  img.src = ok;
  const loaded = await new Promise((r) => {
    img.onload = () => r(true);
    img.onerror = () => r(false);
  });
  // A File made in the page has no path on disk, so nothing must be copied
  const inMemory = await api.saveDroppedFile(new File(['x'], 'fake.png', { type: 'image/png' }));
  // The editor's own "browse image" input, filled like a real pick
  a.createNewNote();
  const before = a.richEditor.querySelectorAll('img').length;
  console.log('__PICK__:' + JSON.stringify(['#browseImageInput', iconPath]));
  for (let i = 0; i < 40 && a.richEditor.querySelectorAll('img').length === before; i++)
    await new Promise((r) => setTimeout(r, 50));
  const inserted = a.richEditor.querySelector('img')?.getAttribute('src') || null;
  return {
    url: ok,
    loaded,
    inMemory,
    browseInserted: !!inserted && inserted.startsWith('capnote-file://upload/'),
    browseCleared: a.browseImageInput.value === '',
  };
}

export const expected = {
  url: /^capnote-file:\/\/upload\/\d+-\w+-capnote-32\.png$/,
  loaded: true,
  inMemory: null,
  browseInserted: true,
  browseCleared: true,
};
