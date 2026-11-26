// Text files edited in Capnote: "Edit with Capnote" in the Windows right-click menu of text files
// (Markdown, HTML and plain text, and the everyday text formats: XML, JSON, scripts, settings,
// logs, source code…) opens the file as a file note, and saving the note writes the file back, as a
// text editor does. The main process reads and writes the files; the page keeps the note.
//
// Files come from the command line: Capnote started on a file, or started again (the second
// instance hands its command line over). The page asks for the files once it is ready; files that
// come later are sent to it.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { app, dialog, ipcMain, shell } from 'electron';
import { getMainWindow, showMainWindow } from './window.js';
import { readText, writeText, detectTextFormat } from './text-encoding.js';
import { EXTENSIONS, extensionOf, isSupportedFile } from './file-types.js';

// The key under each extension's right-click verbs
const VERB = 'CapnoteEdit';
const LABELS = { tr: 'Capnote ile düzenle', en: 'Edit with Capnote' };
// Files larger than this are not opened as notes
const MAX_BYTES = 10 * 1024 * 1024;

let pageReady = false;
const pending = [];
// The files the page may read and write: the ones opened, and the file notes it already has
const known = new Set();
const keyOf = (filePath) => path.resolve(filePath).toLowerCase();

const isSupported = isSupportedFile;

// The supported files named on a command line (flags, the app and folders are skipped). Not
// packaged, the line starts with Electron and then the app's own entry file (a .js), skipped too.
function filesFromArgv(argv, cwd = process.cwd()) {
  return argv
    .slice(app.isPackaged ? 1 : 2)
    .filter((arg) => arg && !arg.startsWith('-'))
    .map((arg) => path.resolve(cwd, arg))
    .filter((filePath) => {
      if (!isSupported(filePath)) return false;
      try {
        return fs.statSync(filePath).isFile();
      } catch {
        return false;
      }
    });
}

function readFileNote(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size > MAX_BYTES) return { ok: false, error: 'too-large', path: filePath };
  return {
    ok: true,
    path: filePath,
    name: path.basename(filePath),
    ext: extensionOf(filePath).slice(1),
    // Decoded as it is stored (UTF-8, UTF-16 or the Windows code page), with plain line ends
    content: readText(fs.readFileSync(filePath)).text,
    mtimeMs: stat.mtimeMs,
  };
}

// show: bring the window forward (not for files dropped on it, which is already in front)
function openFiles(paths, { show = true } = {}) {
  paths.forEach((filePath) => {
    known.add(keyOf(filePath));
    let file;
    try {
      file = readFileNote(filePath);
    } catch (err) {
      file = { ok: false, error: String(err.message || err), path: filePath };
    }
    const win = getMainWindow();
    if (pageReady && win) {
      if (show) showMainWindow();
      win.webContents.send('file:open', file);
    } else {
      pending.push(file);
    }
  });
}

// Write the file in place, so it stays the same file (on the desktop it keeps its spot; a file
// written beside it and moved over it is a new file there). Its old text is copied aside first and
// put back if the write fails, so a failed write never leaves half a file.
// It keeps its encoding and line ends (CRLF or LF) as they are on disk.
function writeFileSafely(filePath, content) {
  const backup = path.join(os.tmpdir(), `capnote-${process.pid}-${path.basename(filePath)}.bak`);
  const existed = fs.existsSync(filePath);
  const format = existed ? detectTextFormat(fs.readFileSync(filePath)) : undefined;
  if (existed) fs.copyFileSync(filePath, backup);
  try {
    fs.writeFileSync(filePath, writeText(content, format));
  } catch (err) {
    if (existed) fs.copyFileSync(backup, filePath);
    throw err;
  } finally {
    if (existed) fs.rmSync(backup, { force: true });
  }
  return fs.statSync(filePath).mtimeMs;
}

// ---- The right-click menu (Windows): per user, under each extension's shell verbs
function regKey(ext) {
  return `HKCU\\Software\\Classes\\SystemFileAssociations\\${ext}\\shell\\${VERB}`;
}

const reg = (args) =>
  new Promise((resolve) => execFile('reg', args, { windowsHide: true }, (err) => resolve(!err)));

// The menu entry of every extension as one .reg file (one reg.exe run for all of them, not three
// per extension): its label, the app's icon and the command that opens the file
function contextMenuRegFile(label, exe) {
  const text = (value) => `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  // A .reg file names the hive in full (reg.exe's commands take "HKCU")
  const key = (ext) => regKey(ext).replace(/^HKCU\\/, 'HKEY_CURRENT_USER\\');
  const lines = ['Windows Registry Editor Version 5.00', ''];
  EXTENSIONS.forEach((ext) => {
    lines.push(`[${key(ext)}]`, `@=${text(label)}`, `"Icon"=${text(exe)}`, '');
    lines.push(`[${key(ext)}\\command]`, `@=${text(`"${exe}" "%1"`)}`, '');
  });
  return lines.join('\r\n');
}

// The reg.exe commands that remove the menu entry from every extension
function contextMenuRemoveCommands() {
  return EXTENSIONS.map((ext) => ['delete', regKey(ext), '/f']);
}

// Only the installed app registers itself: a source checkout would register Electron's own exe
async function setContextMenu(enabled, language = 'tr') {
  if (process.platform !== 'win32') return { ok: false, error: 'unsupported' };
  if (!app.isPackaged) return { ok: false, error: 'dev' };
  if (!enabled) {
    // Removing a key that is not there fails harmlessly
    await Promise.all(contextMenuRemoveCommands().map(reg));
    return { ok: true, enabled };
  }
  const label = LABELS[language] || LABELS.tr;
  const file = path.join(os.tmpdir(), `capnote-menu-${process.pid}.reg`);
  try {
    // reg.exe reads .reg files as UTF-16 with a byte order mark
    fs.writeFileSync(file, '\ufeff' + contextMenuRegFile(label, process.execPath), 'utf16le');
    const ok = await reg(['import', file]);
    return { ok, enabled };
  } finally {
    fs.rmSync(file, { force: true });
  }
}

function registerFileIpc({ settings = () => ({}), notes = () => [] } = {}) {
  // The file notes the page already has may be read and written again
  try {
    (notes() || []).forEach((note) => note && note.filePath && known.add(keyOf(note.filePath)));
  } catch {}

  ipcMain.handle('files:take-pending', () => {
    pageReady = true;
    return pending.splice(0);
  });

  ipcMain.handle('files:read', (event, filePath) => {
    if (typeof filePath !== 'string' || !known.has(keyOf(filePath))) return { ok: false };
    try {
      return readFileNote(filePath);
    } catch (err) {
      return { ok: false, error: err.code === 'ENOENT' ? 'missing' : String(err.message || err) };
    }
  });

  // Save: refused (conflict) when the file changed on disk since it was read, unless forced
  ipcMain.handle('files:write', (event, payload) => {
    const { path: filePath, content, mtimeMs, force } = payload || {};
    if (typeof filePath !== 'string' || typeof content !== 'string') return { ok: false };
    if (!known.has(keyOf(filePath)) || !isSupported(filePath)) return { ok: false };
    try {
      if (!force && mtimeMs && fs.existsSync(filePath)) {
        if (fs.statSync(filePath).mtimeMs > mtimeMs + 1) return { ok: false, conflict: true };
      }
      return { ok: true, mtimeMs: writeFileSafely(filePath, content) };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  });

  // Files dragged into the notes list: the supported ones open as file notes; the names of the
  // others come back so the page can say they are not supported
  ipcMain.handle('files:open-dropped', (event, paths) => {
    const list = (Array.isArray(paths) ? paths : []).filter((p) => typeof p === 'string' && p);
    const isFile = (p) => {
      try {
        return fs.statSync(p).isFile();
      } catch {
        return false;
      }
    };
    const supported = list.filter((p) => isSupported(p) && isFile(p));
    openFiles(supported, { show: false });
    return {
      opened: supported.length,
      unsupported: list.filter((p) => !supported.includes(p)).map((p) => path.basename(p)),
    };
  });

  // "Save as file": an ordinary note is written to a .md or .txt file the user picks, and becomes a
  // file note of it. The page sends the note's text in both forms; the chosen extension decides.
  ipcMain.handle('files:save-as-new', async (event, payload) => {
    const { name, markdown, text } = payload || {};
    if (typeof name !== 'string' || typeof markdown !== 'string' || typeof text !== 'string')
      return { ok: false };
    const win = getMainWindow();
    const picked = await dialog.showSaveDialog(win, {
      defaultPath: `${name.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'note'}.md`,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Text', extensions: ['txt'] },
      ],
    });
    if (picked.canceled || !picked.filePath) return { ok: false, canceled: true };
    let filePath = picked.filePath;
    if (!isSupported(filePath)) filePath += '.md';
    const ext = extensionOf(filePath).slice(1);
    const content = ext === 'md' || ext === 'markdown' ? markdown : text;
    try {
      const mtimeMs = writeFileSafely(filePath, content);
      known.add(keyOf(filePath));
      return { ok: true, path: filePath, name: path.basename(filePath), ext, content, mtimeMs };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  });

  // Deleting a file note can delete its file too: it goes to the Recycle Bin, not away for good
  ipcMain.handle('files:trash', async (event, filePath) => {
    if (typeof filePath !== 'string' || !known.has(keyOf(filePath)) || !isSupported(filePath))
      return { ok: false };
    if (!fs.existsSync(filePath)) return { ok: false, error: 'missing' };
    try {
      await shell.trashItem(path.resolve(filePath));
      known.delete(keyOf(filePath));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  });

  ipcMain.handle('files:reveal', (event, filePath) => {
    if (typeof filePath === 'string' && known.has(keyOf(filePath)))
      shell.showItemInFolder(filePath);
  });

  ipcMain.handle('files:context-menu', (event, enabled) => {
    const s = settings() || {};
    return setContextMenu(!!enabled, s.language);
  });

  // The menu entry follows the app's language
  ipcMain.on('set-language', (event, lang) => {
    const s = settings() || {};
    if (s.fileContextMenu !== false) setContextMenu(true, lang);
  });
}

export {
  filesFromArgv,
  openFiles,
  registerFileIpc,
  setContextMenu,
  contextMenuRegFile,
  EXTENSIONS,
};
