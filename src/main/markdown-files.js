// Markdown files on disk: writing an export into a folder the user picks (with the images the notes
// use) and reading .md files to import (copying the images they point to into the uploads).

import fs from 'fs';
import path from 'path';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { uploadsDir } from './paths.js';

const MAX_MARKDOWN_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_BYTES = 100 * 1024 * 1024;
const IMAGE_FILE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

// A folder that does not exist yet: "Capnote 2026-09-12", then "(2)", "(3)"...
function freshFolder(parent) {
  const base = `Capnote ${new Date().toISOString().slice(0, 10)}`;
  let folder = path.join(parent, base);
  for (let i = 2; fs.existsSync(folder); i++) folder = path.join(parent, `${base} (${i})`);
  return folder;
}

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

function registerMarkdownIpc() {
  // files: [{ path: 'Folder/Title.md', content }], attachments: upload file names
  ipcMain.handle('markdown:export', async (event, payload) => {
    const { files = [], attachments = [] } = payload || {};
    if (!Array.isArray(files) || !Array.isArray(attachments))
      return { ok: false, error: 'Invalid' };
    const parent = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = await dialog.showOpenDialog(parent, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (canceled || !filePaths || !filePaths[0]) return { ok: false, canceled: true };
    try {
      const folder = freshFolder(filePaths[0]);
      fs.mkdirSync(folder, { recursive: true });
      files.forEach((file) => {
        if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') return;
        // Only paths inside the export folder
        const target = path.resolve(folder, file.path);
        if (!target.startsWith(folder + path.sep)) return;
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, file.content, 'utf8');
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

  // Returns [{ name, content, images: { ref: capnote-file URL } }] for the files the user picks
  ipcMain.handle('markdown:import', async (event) => {
    const parent = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = await dialog.showOpenDialog(parent, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
    });
    if (canceled || !filePaths || !filePaths.length) return { ok: false, canceled: true };
    const files = [];
    filePaths.forEach((file) => {
      try {
        if (fs.statSync(file).size > MAX_MARKDOWN_BYTES) return;
        const content = fs.readFileSync(file, 'utf8');
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
        files.push({ name: path.basename(file), content, images });
      } catch (err) {
        console.error('Could not read', file, err);
      }
    });
    return { ok: true, files };
  });
}

export { registerMarkdownIpc };
