// Markdown round trip: every note exported as a .md file (folders as folders, images in
// "attachments", links between notes as [[Title]], locked notes left out), then the files
// imported back as notes with their headings, tasks, tables, code, tags, mood, image and links

export async function seed() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // A real image file for the uploads: the app icon, picked like a user would
  const root = decodeURIComponent(new URL('../../', location.href).pathname).replace(/^\//, '');
  const pickFile = (p) =>
    new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.id = 'pick' + Math.random().toString(36).slice(2);
      input.hidden = true;
      document.body.appendChild(input);
      input.addEventListener('change', () => resolve(input.files[0]), { once: true });
      console.log('__PICK__:' + JSON.stringify(['#' + input.id, p]));
    });
  const image = await window.electronAPI.saveDroppedFile(
    await pickFile(root + 'assets/icons/capnote-32.png')
  );

  const make = (title, html, extra = {}) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = html;
    a.tags = extra.tags || [];
    a.selectedMood = extra.mood || null;
    a.saveNote(true);
    Object.assign(a.currentNote, extra.fields || {});
    return a.currentNote;
  };
  a.folders.push({ id: 'fw', name: 'Work', color: '#3b82f6', expanded: true });
  const plan = make('Plan', '<p>The plan.</p>', { fields: { folderId: 'fw' } });
  make(
    'Diary',
    '<h2>Morning</h2><p>Some <b>bold</b>, <i>italic</i> and <s>gone</s> text with a <a href="https://example.com">link</a>.</p>' +
      `<p>See <a class="note-link" data-note-id="${plan.id}" href="#">Plan</a>.</p>` +
      '<ul><li>One</li><li>Two</li></ul><ol><li>First</li></ol>' +
      '<div class="checklist"><div class="checklist-item"><input type="checkbox" id="m1" checked="checked"><label for="m1">Done</label></div><div class="checklist-item"><input type="checkbox" id="m2"><label for="m2">Open</label></div></div>' +
      '<blockquote>Quoted</blockquote><hr>' +
      '<pre><code>let x = 1;\nx++;</code></pre>' +
      '<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>1</td><td>2</td></tr></tbody></table>' +
      `<p><img src="${image}" alt="icon"></p>`,
    { tags: ['life', 'work'], mood: 'happy' }
  );
  make('Secret', '<p>hidden</p>', { fields: { isLocked: true } });
  await a.saveNotes();
  await a.saveFolders();
  await a.exportMarkdown();
  await wait(300);
  return 'seeded';
}

export async function run() {
  const a = window.app;
  // Import into an empty app: the notes come back from the files alone
  a.notes = [];
  a.folders = [];
  await a.importMarkdown();
  const diary = a.notes.find((n) => n.title === 'Diary');
  const plan = a.notes.find((n) => n.title === 'Plan');
  const doc = new DOMParser().parseFromString(diary.content, 'text/html');
  const link = doc.querySelector('a.note-link');
  return {
    titles: a.notes.map((n) => n.title).sort(),
    tags: diary.tags,
    mood: diary.mood,
    heading: doc.querySelector('h2')?.textContent,
    styles: ['strong', 'em', 'del'].map((t) => !!doc.querySelector(t)),
    webLink: doc.querySelector('a[href="https://example.com"]')?.textContent,
    noteLink: !!link && link.dataset.noteId === plan.id,
    lists: [doc.querySelectorAll('ul li').length, doc.querySelectorAll('ol li').length],
    tasks: [...doc.querySelectorAll('.checklist-item')].map(
      (i) => (i.querySelector('input').hasAttribute('checked') ? 'x ' : '  ') + i.textContent.trim()
    ),
    quote: doc.querySelector('blockquote')?.textContent.trim(),
    divider: !!doc.querySelector('hr'),
    code: doc.querySelector('pre code')?.textContent,
    tableCells: [...doc.querySelectorAll('td, th')].map((c) => c.textContent),
    imageImported: /^capnote-file:\/\/upload\//.test(doc.querySelector('img')?.getAttribute('src')),
    attachments: diary.attachments.length,
  };
}

export const expected = {
  titles: ['Diary', 'Plan'],
  tags: ['life', 'work'],
  mood: 'happy',
  heading: 'Morning',
  styles: [true, true, true],
  webLink: 'link',
  noteLink: true,
  lists: [2, 1],
  tasks: ['x Done', '  Open'],
  quote: 'Quoted',
  divider: true,
  code: 'let x = 1;\nx++;\n',
  tableCells: ['A', 'B', '1', '2'],
  imageImported: true,
  attachments: 1,
};

export function checkFiles(files) {
  const names = Object.keys(files).sort();
  const folder = names[0].split('/')[0];
  const read = (rel) => files[`${folder}/${rel}`]?.toString('utf8') || '';
  const diary = read('Diary.md');
  return {
    folderName: /^Capnote \d{4}-\d{2}-\d{2}$/.test(folder),
    files: names.map((n) =>
      n.slice(folder.length + 1).replace(/^attachments\/.+$/, 'attachments/<image>')
    ),
    frontMatter:
      diary.startsWith('---\ntitle: "Diary"\n') &&
      diary.includes('tags: ["life", "work"]') &&
      diary.includes('mood: happy'),
    parts: [
      '# Diary',
      '## Morning',
      'Some **bold**, *italic* and ~~gone~~ text with a [link](https://example.com).',
      'See [[Plan]].',
      '- One\n- Two',
      '1. First',
      '- [x] Done\n- [ ] Open',
      '> Quoted',
      '---',
      '```\nlet x = 1;\nx++;\n```',
      '| A | B |\n| --- | --- |\n| 1 | 2 |',
      '![icon](attachments/',
    ].filter((part) => !diary.includes(part)),
    planInFolder: read('Work/Plan.md').includes('The plan.'),
    lockedLeftOut: !names.some((n) => n.includes('Secret')),
  };
}

export const expectedFiles = {
  folderName: true,
  files: ['Diary.md', 'Work/Plan.md', 'attachments/<image>'],
  frontMatter: true,
  parts: [],
  planInFolder: true,
  lockedLeftOut: true,
};
