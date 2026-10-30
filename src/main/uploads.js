// Files dropped into notes. They are copied into userData/uploads and referenced as
// capnote-file://upload/<name>, which keeps note content independent of where the user data
// folder lives (so backups work on another machine).

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { ipcMain, protocol, net } from 'electron';
import { uploadsDir } from './paths.js';

// Largest file accepted into the uploads folder
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

// Uploads younger than this are kept by the cleanup: they may belong to a note not saved yet
const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;

// Must run before the app is ready
function registerUploadScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'capnote-file',
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
    },
  ]);
}

// Resolve a capnote-file URL to a path inside the uploads folder (never outside of it)
function uploadPathFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'capnote-file:' || parsed.hostname !== 'upload') return null;
    const name = path.basename(decodeURIComponent(parsed.pathname));
    return name ? path.join(uploadsDir(), name) : null;
  } catch {
    return null;
  }
}

// Only plain file names inside the uploads folder are accepted from the renderer
function safeUploadName(name) {
  if (typeof name !== 'string') return null;
  const base = path.basename(name);
  return base && base === name && base !== '.' && base !== '..' ? base : null;
}

// Serves capnote-file URLs; must run once the app is ready
function handleUploadProtocol() {
  protocol.handle('capnote-file', (request) => {
    const filePath = uploadPathFromUrl(request.url);
    if (!filePath || !fs.existsSync(filePath)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(filePath).href);
  });
}

// keepAlso(): more names to keep (the files the backups use), or null to delete nothing
function registerUploadIpc({ keepAlso = () => [] } = {}) {
  // Copy a file dropped from the OS into the uploads folder and return its capnote-file URL.
  // The path comes from the renderer, so only existing regular files of a sane size are accepted.
  ipcMain.handle('save-dropped-file', (event, srcPath) => {
    try {
      if (!srcPath || typeof srcPath !== 'string' || !path.isAbsolute(srcPath)) return null;
      const stat = fs.statSync(srcPath);
      if (!stat.isFile() || stat.size > MAX_UPLOAD_BYTES) return null;

      fs.mkdirSync(uploadsDir(), { recursive: true });
      // Prefix with a timestamp and a random part to avoid collisions
      // Only letters, digits, dot, dash and underscore, so the name reads the same in every URL
      const plainName = path.basename(srcPath).replace(/[^\p{L}\p{N}._-]/gu, '_');
      const targetName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${plainName}`;
      fs.copyFileSync(srcPath, path.join(uploadsDir(), targetName));
      return `capnote-file://upload/${encodeURIComponent(targetName)}`;
    } catch (err) {
      console.error('Failed to save dropped file:', err);
      return null;
    }
  });

  // Read upload files for a backup: { name: base64 }
  ipcMain.handle('uploads:read', (event, names) => {
    const files = {};
    (Array.isArray(names) ? names : []).forEach((name) => {
      const safe = safeUploadName(name);
      const file = safe && path.join(uploadsDir(), safe);
      if (file && fs.existsSync(file)) files[safe] = fs.readFileSync(file).toString('base64');
    });
    return files;
  });

  // Restore upload files from a backup; existing files are left untouched
  ipcMain.handle('uploads:write', (event, files) => {
    let written = 0;
    fs.mkdirSync(uploadsDir(), { recursive: true });
    Object.entries(files && typeof files === 'object' ? files : {}).forEach(([name, data]) => {
      const safe = safeUploadName(name);
      if (!safe || typeof data !== 'string') return;
      const file = path.join(uploadsDir(), safe);
      if (fs.existsSync(file)) return;
      const buffer = Buffer.from(data, 'base64');
      if (buffer.length > MAX_UPLOAD_BYTES) return;
      fs.writeFileSync(file, buffer);
      written++;
    });
    return written;
  });

  // Delete uploads that no note references, now or in a backup
  ipcMain.handle('uploads:cleanup', (event, keepNames) => {
    const kept = keepAlso();
    if (kept === null) return 0;
    const keep = new Set([...(Array.isArray(keepNames) ? keepNames : []), ...kept]);
    const dir = uploadsDir();
    if (!fs.existsSync(dir)) return 0;
    let removed = 0;
    fs.readdirSync(dir).forEach((name) => {
      if (keep.has(name)) return;
      const file = path.join(dir, name);
      const stat = fs.statSync(file);
      if (stat.isFile() && Date.now() - stat.mtimeMs > ORPHAN_MIN_AGE_MS) {
        fs.rmSync(file, { force: true });
        removed++;
      }
    });
    return removed;
  });
}

export { registerUploadScheme, handleUploadProtocol, registerUploadIpc, uploadPathFromUrl };
