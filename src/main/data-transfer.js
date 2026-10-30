// Exporting and importing data files. One save dialog exports either a Capnote backup (.json) or
// the notes as Markdown files (the file type picked in the dialog decides); one open dialog imports
// backups and Markdown files together, each recognised by its extension. Markdown exports carry
// the images the notes use, and imported Markdown brings the images it points to into the uploads.

import fs from 'fs';
import path from 'path';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { uploadsDir } from './paths.js';

// A backup holds its images, so it may be larger than a Markdown file
const MAX_MARKDOWN_BYTES = 5 * 1024 * 1024;
const MAX_BACKUP_BYTES = 500 * 1024 * 1024;
const MAX_IMAGE_BYTES = 100 * 1024 * 1024;
const IMAGE_FILE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

// A folder that does not exist yet: "<name>", then "<name> (2)", "(3)"...
function freshFolder(parent, base) {
  let folder = path.join(parent, base);
  for (let i = 2; fs.existsSync(folder); i++) folder = path.join(parent, `${base} (${i})`);
  return folder;
}

// Where the export the user chose goes; the write calls may only write there
let pendingExport = null;

// Copy an image a note points to into the uploads and return its capnote-file URL
function importImage(file) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES || !IMAGE_FILE.test(file)) return null;
  fs.mkdirSync(uploadsDir(), { recursive: true });
  const plain = path.basename(file).replace(/[^\p{L}\p{N}._-]/gu, '_');
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${plain}`;
  fs.copyFileSync(file, path.join(uploadsDir(), name));
  return `capnote-file://upload/${encodeURIComponent(name)}`;
}

function registerDataTransferIpc() {
  // Ask where to export and in which format: a .json path is a backup, a .md path Markdown files
  ipcMain.handle('data:choose-export', async (event, payload) => {
    const { defaultName = 'capnote', labels = {} } = payload || {};
    const parent = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(parent, {
      defaultPath: `${defaultName}.json`,
      filters: [
        { name: labels.backup || 'Capnote backup', extensions: ['json'] },
        { name: labels.markdown || 'Markdown', extensions: ['md'] },
      ],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    const markdown = /\.(md|markdown)$/i.test(filePath);
    pendingExport = markdown || /\.json$/i.test(filePath) ? filePath : `${filePath}.json`;
    return {
      ok: true,
      format: markdown ? 'markdown' : 'backup',
      name: path.basename(pendingExport),
    };
  });

  ipcMain.handle('data:write-backup', (event, content) => {
    const target = pendingExport;
    pendingExport = null;
    if (!target || typeof content !== 'string') return { ok: false, error: 'No export chosen' };
    try {
      fs.writeFileSync(target, content, 'utf8');
      return { ok: true, filePath: target };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  });

  // files: [{ path: 'Folder/Title.md', content }], attachments: upload file names. They go into a
  // folder named like the chosen file, next to it.
  ipcMain.handle('markdown:export', (event, payload) => {
    const { files = [], attachments = [] } = payload || {};
    const target = pendingExport;
    pendingExport = null;
    if (!target) return { ok: false, error: 'No export chosen' };
    if (!Array.isArray(files) || !Array.isArray(attachments))
      return { ok: false, error: 'Invalid' };
    try {
      const folder = freshFolder(
        path.dirname(target),
        path.basename(target).replace(/\.(md|markdown)$/i, '')
      );
      fs.mkdirSync(folder, { recursive: true });
      files.forEach((file) => {
        if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') return;
        // Only paths inside the export folder
        const where = path.resolve(folder, file.path);
        if (!where.startsWith(folder + path.sep)) return;
        fs.mkdirSync(path.dirname(where), { recursive: true });
        fs.writeFileSync(where, file.content, 'utf8');
      });
      attachments.forEach((name) => {
        const plain = typeof name === 'string' ? path.basename(name) : '';
        const source = plain && path.join(uploadsDir(), plain);
        if (!source || plain !== name || !fs.existsSync(source)) return;
        fs.mkdirSync(path.join(folder, 'attachments'), { recursive: true });
        fs.copyFileSync(source, path.join(folder, 'attachments', plain));
      });
      return { ok: true, folder: path.basename(folder), path: folder };
    } catch (err) {
      console.error('Markdown export failed:', err);
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  });

  // The files the user picks: [{ name, kind: 'backup' | 'markdown', content, images }]. A Markdown
  // file's images (given by a path next to it) are copied into the uploads: images is ref -> URL.
  ipcMain.handle('data:import', async (event, payload) => {
    const { label = 'Capnote' } = payload || {};
    const parent = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = await dialog.showOpenDialog(parent, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: label, extensions: ['json', 'md', 'markdown', 'txt'] }],
    });
    if (canceled || !filePaths || !filePaths.length) return { ok: false, canceled: true };
    const files = [];
    filePaths.forEach((file) => {
      try {
        const limit = /\.json$/i.test(file) ? MAX_BACKUP_BYTES : MAX_MARKDOWN_BYTES;
        if (fs.statSync(file).size > limit) return;
        const content = fs.readFileSync(file, 'utf8');
        if (/\.json$/i.test(file)) {
          files.push({ name: path.basename(file), kind: 'backup', content });
          return;
        }
        const images = {};
        // Images given by a path next to the file (not a web address)
        for (const match of content.matchAll(/!\[[^\]]*\]\(<?([^)\s>]+)>?/g)) {
          const ref = match[1];
          if (images[ref] || /^[a-z][\w+.-]*:/i.test(ref)) continue;
          let relative = ref;
          try {
            relative = decodeURIComponent(ref);
          } catch {
            // keep it as written
          }
          const source = path.resolve(path.dirname(file), relative);
          if (fs.existsSync(source)) {
            const url = importImage(source);
            if (url) images[ref] = url;
          }
        }
        files.push({ name: path.basename(file), kind: 'markdown', content, images });
      } catch (err) {
        console.error('Could not read', file, err);
      }
    });
    return { ok: true, files };
  });
}

export { registerDataTransferIpc };
