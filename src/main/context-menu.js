// The right-click menu of the page's text and pictures: cut, copy, paste and select all in what
// can be written in (a note's text, a field), copy on selected text, copy on a picture. The app's
// own menus (a note, a folder, the list) take their right-clicks before this.

import { Menu } from 'electron';
import { uiLanguage } from './tray.js';

const LABELS = {
  tr: {
    cut: 'Kes',
    copy: 'Kopyala',
    paste: 'Yapıştır',
    selectAll: 'Tümünü Seç',
    copyImage: 'Resmi Kopyala',
  },
  en: {
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    copyImage: 'Copy Image',
  },
};

function setupContextMenu(win) {
  win.webContents.on('context-menu', (_event, params) => {
    const t = LABELS[uiLanguage()] || LABELS.tr;
    const flags = params.editFlags;
    const items = [];
    if (params.mediaType === 'image') {
      items.push({
        label: t.copyImage,
        click: () => win.webContents.copyImageAt(params.x, params.y),
      });
    }
    if (params.isEditable) {
      if (items.length) items.push({ type: 'separator' });
      items.push(
        { label: t.cut, role: 'cut', enabled: flags.canCut },
        { label: t.copy, role: 'copy', enabled: flags.canCopy },
        { label: t.paste, role: 'paste', enabled: flags.canPaste },
        { type: 'separator' },
        { label: t.selectAll, role: 'selectAll' }
      );
    } else if (params.selectionText.trim()) {
      if (items.length) items.push({ type: 'separator' });
      items.push({ label: t.copy, role: 'copy' });
    }
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });
}

export { setupContextMenu };
