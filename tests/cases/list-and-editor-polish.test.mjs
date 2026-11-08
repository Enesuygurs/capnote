// Pinned notes and folders stay in the order they were pinned (a folder pinned after notes comes
// after them); an empty mood or weather card has its message in the middle of the card; an image
// on the clipboard is pasted into the note; the text style, font and size boxes have room between
// them; and the note icons in the list can be hidden in the settings.

export async function run() {
  const a = window.app;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const r = {};
  const note = (title) => {
    a.createNewNote();
    a.noteTitle.value = title;
    a.richEditor.innerHTML = `<p>${title}</p>`;
    a.saveNote(true);
    const made = a.currentNote;
    a.escapeEditor();
    return made;
  };
  const rows = () =>
    [...a.notesList.children]
      .map((el) =>
        el.classList.contains('note-item')
          ? el.querySelector('.note-item-title')?.textContent
          : el.querySelector('.folder-name, .nav-text')?.textContent
      )
      .filter(Boolean);

  // Three notes pinned, then a folder: the folder comes after them, in both kinds of order
  const n1 = note('One');
  const n2 = note('Two');
  const n3 = note('Three');
  note('Loose');
  a.folders.push({ id: 'f1', name: 'Box', createdAt: new Date().toISOString(), color: '#3b82f6' });
  for (const n of [n1, n2, n3]) {
    await a.togglePin(n.id);
    await wait(5);
  }
  await a.togglePinFolders(['f1']);
  a.changeSorting('date-desc');
  r.pinnedByDate = rows().slice(0, 4);
  a.changeSorting('manual');
  r.pinnedManual = rows().slice(0, 4);
  // Unpinned, the folder leaves the pinned group
  await a.togglePinFolders(['f1']);
  a.changeSorting('date-desc');
  r.unpinnedFolderInList = rows().includes('Box');
  r.unpinnedFolderBelow = !!document.querySelector(
    '#foldersList .folder-item, #foldersList [data-folder-id]'
  );

  // An empty mood card: the message fills the card, centered
  a.renderBarList(a.moodChart || document.getElementById('moodChart'), [], 'mood', null, 'day');
  const chart = document.getElementById('moodChart');
  const msg = chart.querySelector('.chart-empty');
  const card = chart.closest('.chart-card');
  const s = getComputedStyle(msg);
  r.emptyCentered = {
    cls: chart.classList.contains('is-empty'),
    position: s.position,
    align: [s.alignItems, s.justifyContent, s.textAlign],
    cardPositioned: getComputedStyle(card).position,
  };

  // Pasting an image (a screenshot: no file of its own) puts it into the note
  a.createNewNote();
  a.richEditor.innerHTML = '<p>before</p>';
  a.richEditor.focus();
  a.placeCaret(a.richEditor.querySelector('p'), 1);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 4;
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const dt = new DataTransfer();
  dt.items.add(new File([blob], 'image.png', { type: 'image/png' }));
  dt.setData('text/plain', 'should not be pasted');
  a.richEditor.dispatchEvent(
    new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
  );
  await wait(400);
  const img = a.richEditor.querySelector('img');
  r.paste = {
    image: !!img,
    src: /^capnote-file:\/\/upload\/\d+-\w+-pasted\.png$/.test(img?.getAttribute('src') || ''),
    textPasted: a.richEditor.textContent.includes('should not'),
  };
  if (img) {
    await new Promise((res) => (img.complete ? res() : (img.onload = img.onerror = res)));
    r.paste.loads = img.naturalWidth === 4;
  }
  a.cancelEdit();

  // Room between the text style, font and size boxes
  const boxes = ['blockStyle', 'fontFamily', 'fontSize'].map((id) =>
    document.getElementById(id).getBoundingClientRect()
  );
  a.createNewNote();
  const boxes2 = ['blockStyle', 'fontFamily', 'fontSize'].map((id) =>
    document.getElementById(id).getBoundingClientRect()
  );
  r.boxGaps = [boxes2[1].left - boxes2[0].right, boxes2[2].left - boxes2[1].right];
  a.cancelEdit();
  void boxes;

  // Hiding the note icons
  // An ordinary note's icon (a lock or a pin stays when icons are hidden)
  const icon = () =>
    getComputedStyle(
      a.notesList.querySelector('.note-item .nav-icon:not(.fa-lock, .fa-lock-open, .fa-thumbtack)')
    ).display;
  r.iconsShown = icon() !== 'none';
  a.hideNoteIconsToggle.checked = true;
  a.hideNoteIconsToggle.dispatchEvent(new Event('change'));
  r.iconsHidden = { display: icon(), setting: a.settings.hideNoteIcons };
  a.hideNoteIconsToggle.checked = false;
  a.hideNoteIconsToggle.dispatchEvent(new Event('change'));
  r.iconsBack = icon() !== 'none';
  return r;
}

export const expected = {
  pinnedByDate: ['One', 'Two', 'Three', 'Box'],
  pinnedManual: ['One', 'Two', 'Three', 'Box'],
  unpinnedFolderInList: false,
  unpinnedFolderBelow: true,
  emptyCentered: {
    cls: true,
    position: 'absolute',
    align: ['center', 'center', 'center'],
    cardPositioned: 'relative',
  },
  paste: { image: true, src: true, textPasted: false, loads: true },
  boxGaps: [8, 8],
  iconsShown: true,
  iconsHidden: { display: 'none', setting: true },
  iconsBack: true,
};
