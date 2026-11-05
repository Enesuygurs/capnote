// Text files edited in Capnote: "Edit with Capnote" in the Windows right-click menu of .md, .txt
// and .html files opens the file as a file note, and saving the note writes the file back, as a text
// editor does. The main process reads and writes the files; the page keeps the note.
//
// Files come from the command line: Capnote started on a file, or started again (the second
// instance hands its command line over). The page asks for the files once it is ready; files that
// come later are sent to it.

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { app, ipcMain, shell } from 'electron';
import { getMainWindow, showMainWindow } from './window.js';

const EXTENSIONS = ['.md', '.markdown', '.txt', '.html', '.htm'];
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

const isSupported = (filePath) => EXTENSIONS.includes(path.extname(filePath).toLowerCase());

// The supported files named on a command line (flags, the app and folders are skipped)
function filesFromArgv(argv, cwd = process.cwd()) {
  return argv
    .slice(1)
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
    ext: path.extname(filePath).slice(1).toLowerCase(),
    content: fs.readFileSync(filePath, 'utf8'),
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

// Write next to the file, then move over it, so a failed write never leaves half a file
function writeFileSafely(filePath, content) {
  const temp = path.join(path.dirname(filePath), `.${path.basename(filePath)}.capnote-tmp`);
  fs.writeFileSync(temp, content, 'utf8');
  fs.renameSync(temp, filePath);
  return fs.statSync(filePath).mtimeMs;
}

// ---- The right-click menu (Windows): per user, under each extension's shell verbs
function regKey(ext) {
  return `HKCU\\Software\\Classes\\SystemFileAssociations\\${ext}\\shell\\${VERB}`;
}

const reg = (args) =>
  new Promise((resolve) => execFile('reg', args, { windowsHide: true }, (err) => resolve(!err)));

// The reg.exe commands that add (or remove) the menu entry for every extension
function contextMenuCommands(enabled, label, exe) {
  return EXTENSIONS.flatMap((ext) =>
    enabled
      ? [
          ['add', regKey(ext), '/ve', '/d', label, '/f'],
          ['add', regKey(ext), '/v', 'Icon', '/d', exe, '/f'],
          ['add', `${regKey(ext)}\\command`, '/ve', '/d', `"${exe}" "%1"`, '/f'],
        ]
      : [['delete', regKey(ext), '/f']]
  );
}

// Only the installed app registers itself: a source checkout would register Electron's own exe
async function setContextMenu(enabled, language = 'tr') {
  if (process.platform !== 'win32') return { ok: false, error: 'unsupported' };
  if (!app.isPackaged) return { ok: false, error: 'dev' };
  const label = LABELS[language] || LABELS.tr;
  const results = await Promise.all(contextMenuCommands(enabled, label, process.execPath).map(reg));
  // Removing a key that is not there fails harmlessly
  return { ok: !enabled || results.every(Boolean), enabled };
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
  contextMenuCommands,
  EXTENSIONS,
};
