// Saving exports: a note as PDF (Chromium's own renderer, works offline) or HTML, both around the
// bundled export styles, and plain files (text, JSON, the full backup). Each asks where to save
// first and reports whether the file was written, so the app only says "exported" when it was.

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { RENDERER_DIR } from './paths.js';

// Ask where to save; null when the user cancels
async function askSavePath(event, fileName, filters) {
  const parent = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(parent, {
    defaultPath: fileName,
    filters,
  });
  return canceled || !filePath ? null : filePath;
}

// The exported note as a standalone page with the export styles written into it
function exportDocument(title, bodyHtml, inlineStyles) {
  const safeTitle = String(title).replace(/[<>&"]/g, '');
  const styles = inlineStyles
    ? `<style>${fs.readFileSync(path.join(RENDERER_DIR, 'export.css'), 'utf8')}</style>`
    : '<link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="export.css">';
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>${styles}</head>
<body>${bodyHtml}</body></html>`;
}

const FILTERS = {
  txt: [{ name: 'Text', extensions: ['txt'] }],
  json: [{ name: 'JSON', extensions: ['json'] }],
  html: [{ name: 'HTML', extensions: ['html'] }],
};

function registerExportIpc() {
  // Text, JSON and the full backup: the renderer sends the finished file content
  ipcMain.handle('save-file', async (event, payload) => {
    const { fileName = 'capnote.txt', content, type = 'txt' } = payload || {};
    if (typeof content !== 'string') return { ok: false, error: 'Invalid content' };
    const filePath = await askSavePath(event, fileName, FILTERS[type] || []);
    if (!filePath) return { ok: false, canceled: true };
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return { ok: true, filePath };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  });

  // A note as an HTML page that looks like the PDF and opens anywhere
  ipcMain.handle('export-html', async (event, payload) => {
    const { title = 'note', bodyHtml = '', fileName = 'note.html' } = payload || {};
    if (typeof bodyHtml !== 'string') return { ok: false, error: 'Invalid content' };
    const filePath = await askSavePath(event, fileName, FILTERS.html);
    if (!filePath) return { ok: false, canceled: true };
    try {
      fs.writeFileSync(filePath, exportDocument(title, bodyHtml, true), 'utf8');
      return { ok: true, filePath };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  });

  ipcMain.handle('export-pdf', async (event, payload) => {
    const { title = 'note', bodyHtml = '', fileName = 'note.pdf' } = payload || {};
    if (typeof bodyHtml !== 'string') return { ok: false, error: 'Invalid content' };

    const filePath = await askSavePath(event, fileName, [{ name: 'PDF', extensions: ['pdf'] }]);
    if (!filePath) return { ok: false, canceled: true };

    // The temporary page is loaded from the temp folder, so it points back at the bundled styles
    const rendererDir = pathToFileURL(RENDERER_DIR + path.sep).href;
    const html = exportDocument(title, bodyHtml, false).replace(
      '<meta charset="utf-8">',
      `<meta charset="utf-8"><base href="${rendererDir}">`
    );

    const tmpFile = path.join(app.getPath('temp'), `capnote-export-${Date.now()}.html`);
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { javascript: false, sandbox: true },
    });
    try {
      fs.writeFileSync(tmpFile, html, 'utf8');
      await printWindow.loadFile(tmpFile);
      const pdf = await printWindow.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
      });
      fs.writeFileSync(filePath, pdf);
      return { ok: true, filePath };
    } catch (err) {
      console.error('PDF export failed:', err);
      return { ok: false, error: String(err && err.message ? err.message : err) };
    } finally {
      printWindow.destroy();
      fs.rmSync(tmpFile, { force: true });
    }
  });
}

export { registerExportIpc };
