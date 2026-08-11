// Exporting a note to PDF with Chromium's own renderer (works offline, no third-party library).
// The renderer sends the note body; the document is assembled here around the bundled export styles.

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { RENDERER_DIR } = require('./paths');

function registerExportIpc() {
  ipcMain.handle('export-pdf', async (event, payload) => {
    const { title = 'note', bodyHtml = '', fileName = 'note.pdf' } = payload || {};
    if (typeof bodyHtml !== 'string') return { ok: false, error: 'Invalid content' };

    const parent = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(parent, {
      defaultPath: fileName,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };

    const rendererDir = pathToFileURL(RENDERER_DIR + path.sep).href;
    const html = `<!doctype html><html><head><meta charset="utf-8"><base href="${rendererDir}">
<title>${String(title).replace(/[<>&"]/g, '')}</title>
<link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="export.css"></head>
<body>${bodyHtml}</body></html>`;

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

module.exports = { registerExportIpc };
