// Backups include the uploads notes use, and locked notes stay encrypted in them

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
  const a = window.app;
  const icon = location.href.replace(
    /src\/renderer\/index\.html.*$/,
    'assets/icons/capnote-32.png'
  );
  const iconPath = decodeURIComponent(new URL(icon).pathname).replace(/^\/([A-Za-z]:)/, '$1');
  const used = await window.electronAPI.saveDroppedFile(await pickFile(iconPath));
  const orphan = await window.electronAPI.saveDroppedFile(await pickFile(iconPath));
  const secret = await window.electronAPI.saveDroppedFile(await pickFile(iconPath));
  a.createNewNote();
  a.noteTitle.value = 'With image';
  a.richEditor.innerHTML = `<p><img class="embedded-image" src="${used}"></p>`;
  a.saveNote(true);
  a.createNewNote();
  a.noteTitle.value = 'Locked image';
  a.richEditor.innerHTML = `<p><img class="embedded-image" src="${secret}"></p>`;
  a.saveNote(true);
  const locked = a.currentNote;
  setTimeout(() => {
    a.passwordInput.value = 'pw';
    a.handlePasswordConfirm();
  }, 30);
  await a.toggleLock(locked.id);
  await new Promise((r) => setTimeout(r, 300));
  const name = (u) => decodeURIComponent(u.split('/').pop());
  return {
    used: name(used),
    orphan: name(orphan),
    secret: name(secret),
    lockedAttachments: locked.attachments,
  };
}

export async function run() {
  const a = window.app;
  // What the backup file holds (the exports test checks that the file is written)
  const backup = JSON.parse(JSON.stringify(await a.buildBackupData()));
  const files = Object.keys(backup.attachments || {}).sort();
  const noteFiles = (title) => a.notes.find((n) => n.title === title).attachments;
  const locked = backup.notes.find((n) => n.title === 'Locked image');
  return {
    // The seed uploaded three files; the one no note uses stays out of the backup
    files: files.length,
    withImageIncluded: files.includes(noteFiles('With image')[0]),
    lockedImageIncluded: files.includes(noteFiles('Locked image')[0]),
    lockedStaysEncrypted: locked.content === '' && !!locked.encrypted,
    filesAreBase64: Object.values(backup.attachments).every((data) =>
      /^[A-Za-z0-9+/]+=*$/.test(data)
    ),
  };
}

export const expected = {
  files: 2,
  withImageIncluded: true,
  lockedImageIncluded: true,
  lockedStaysEncrypted: true,
  filesAreBase64: true,
};
