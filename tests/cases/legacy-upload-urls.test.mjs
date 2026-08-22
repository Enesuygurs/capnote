// Absolute and malformed upload URLs from older versions are rewritten and still load

export async function seed() {
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
  // Store an image in uploads, then write notes that reference it the way older versions did
  const icon = location.href.replace(
    /src\/renderer\/index\.html.*$/,
    'assets/icons/capnote-32.png'
  );
  const iconPath = decodeURIComponent(new URL(icon).pathname).replace(/^\/([A-Za-z]:)/, '$1');
  const url = await window.electronAPI.saveDroppedFile(await pickFile(iconPath));
  const name = decodeURIComponent(url.split('/').pop());
  const userData = iconPath.replace(
    /[\\/][^\\/]*capnote[\\/]assets[\\/]icons[\\/]capnote-32\.png$/,
    ''
  );
  const uploads = window.__testUserData.replace(/\\/g, '/') + '/uploads';
  const proper = 'file:///' + encodeURI(uploads + '/' + name);
  const malformed = 'file://' + (uploads + '/' + name).replace(/\//g, '\\');
  const t = new Date().toISOString();
  await window.electronAPI.storage.save('notes', [
    {
      id: 'a',
      title: 'Proper URL',
      content: `<p><img class="embedded-image" src="${proper}"></p>`,
      createdAt: t,
      updatedAt: t,
      tags: [],
    },
    {
      id: 'b',
      title: 'Malformed URL',
      content: `<p><img class="embedded-image" src="${malformed}"><a href="${malformed}">file</a></p>`,
      createdAt: t,
      updatedAt: t,
      tags: [],
    },
    {
      id: 'c',
      title: 'Unrelated file',
      content: '<p><a href="file:///C:/Windows/notepad.exe">x</a></p>',
      createdAt: t,
      updatedAt: t,
      tags: [],
    },
  ]);
  return { url, name, userData };
}

export async function run() {
  const a = window.app;
  const loads = (src) =>
    new Promise((r) => {
      const img = new Image();
      img.onload = () => r(true);
      img.onerror = () => r(false);
      img.src = src;
    });
  const byTitle = (t) => a.notes.find((n) => n.title === t);
  a.selectNote(byTitle('Malformed URL'));
  await new Promise((r) => setTimeout(r, 300));
  const viewerImg = a.viewerText.querySelector('img');
  a.viewerText.querySelector('a').click();
  await new Promise((r) => setTimeout(r, 300));
  return {
    proper: byTitle('Proper URL').content,
    malformed: byTitle('Malformed URL').content,
    unrelatedUntouched: byTitle('Unrelated file').content,
    viewerImageLoaded: viewerImg && viewerImg.complete && viewerImg.naturalWidth > 0,
    protocolLoads: await loads(byTitle('Proper URL').content.match(/src="([^"]+)"/)[1]),
    traversalBlocked: !(await loads('capnote-file://upload/..%2F..%2Fdata%2Fnotes.json')),
  };
}

export const expected = {
  proper:
    /^<p><img class="embedded-image" src="capnote-file:\/\/upload\/\d+-\w+-capnote-32\.png"><\/p>$/,
  malformed:
    /^<p><img class="embedded-image" src="capnote-file:\/\/upload\/\d+-\w+-capnote-32\.png"><a href="capnote-file:\/\/upload\/\d+-\w+-capnote-32\.png">file<\/a><\/p>$/,
  unrelatedUntouched: '<p><a href="file:///C:/Windows/notepad.exe">x</a></p>',
  viewerImageLoaded: true,
  protocolLoads: true,
  traversalBlocked: true,
};
