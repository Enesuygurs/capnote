// Files attached to a note (the "Ekler" strip). They are copied into userData/uploads like the
// images in notes, so a note keeps its files when the originals move or are deleted. A note holds
// at most MAX_NOTE_FILES_BYTES of them; the renderer says how much room its note has left.

import fs from 'fs';
import path from 'path';
import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { uploadsDir } from './paths.js';
import { safeUploadName, newUploadName } from './upload-names.js';
import { openLockedBytes, openLockedCopy } from './locked-images.js';

const MAX_NOTE_FILES_BYTES = 250 * 1024 * 1024;

// Only plain file names inside the uploads folder are accepted from the renderer
function uploadFile(name) {
  const safe = safeUploadName(name);
  return safe && path.join(uploadsDir(), safe);
}

// Copy the files at these paths into the uploads folder while they fit in `room` bytes.
// Returns { added: [{ name, title, size }], tooBig: [titles], failed: [titles] }.
async function copyIntoUploads(paths, room) {
  const result = { added: [], tooBig: [], failed: [] };
  let left = Math.max(0, Math.min(Number(room) || 0, MAX_NOTE_FILES_BYTES));
  await fs.promises.mkdir(uploadsDir(), { recursive: true });
  for (const srcPath of Array.isArray(paths) ? paths : []) {
    const title = typeof srcPath === 'string' ? path.basename(srcPath) : '';
    try {
      if (!title || !path.isAbsolute(srcPath)) throw new Error('bad path');
      const stat = await fs.promises.stat(srcPath);
      if (!stat.isFile()) throw new Error('not a file');
      if (stat.size > left) {
        result.tooBig.push(title);
        continue;
      }
      const name = newUploadName(title);
      await fs.promises.copyFile(srcPath, path.join(uploadsDir(), name));
      left -= stat.size;
      result.added.push({ name, title, size: stat.size });
    } catch (err) {
      console.error('Attaching a file failed:', srcPath, err);
      result.failed.push(title || String(srcPath));
    }
  }
  return result;
}

function registerNoteFilesIpc() {
  // Pick files to attach, then copy those that fit
  ipcMain.handle('note-files:pick', async (event, { room, title } = {}) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const picked = await dialog.showOpenDialog(win, {
      title: typeof title === 'string' ? title : undefined,
      properties: ['openFile', 'multiSelections'],
    });
    if (picked.canceled || !picked.filePaths.length) return null;
    return copyIntoUploads(picked.filePaths, room);
  });

  // Files dropped on a note (their paths come from the preload)
  ipcMain.handle('note-files:add', (event, { paths, room } = {}) => copyIntoUploads(paths, room));

  // Open an attached file with its program (a locked note's, open now: a decrypted copy)
  ipcMain.handle('note-files:open', async (event, name, title) => {
    let file = uploadFile(name);
    if (!file) return { ok: false, error: 'missing' };
    if (!fs.existsSync(file)) {
      file = await openLockedCopy(name, title).catch(() => null);
      if (!file) return { ok: false, error: 'missing' };
    }
    const error = await shell.openPath(file);
    return error ? { ok: false, error } : { ok: true };
  });

  // Save a copy where the user picks, under its own name
  ipcMain.handle('note-files:save-as', async (event, { name, title } = {}) => {
    const file = uploadFile(name);
    if (!file) return { ok: false, error: 'missing' };
    // A locked note's file (open now) is saved decrypted
    const lockedBytes = fs.existsSync(file) ? null : await openLockedBytes(name).catch(() => null);
    if (!fs.existsSync(file) && !lockedBytes) return { ok: false, error: 'missing' };
    const win = BrowserWindow.fromWebContents(event.sender);
    const target = await dialog.showSaveDialog(win, {
      defaultPath: typeof title === 'string' && title ? path.basename(title) : path.basename(file),
    });
    if (target.canceled || !target.filePath) return { ok: false, canceled: true };
    if (lockedBytes) await fs.promises.writeFile(target.filePath, lockedBytes);
    else await fs.promises.copyFile(file, target.filePath);
    return { ok: true };
  });
}

export { registerNoteFilesIpc, copyIntoUploads, MAX_NOTE_FILES_BYTES };
