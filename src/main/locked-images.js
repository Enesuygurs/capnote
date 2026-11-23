// Files of locked notes: the images a locked note shows and the files attached to it. When a
// note is locked they are encrypted with its password (AES-256-GCM, the key from the password with
// scrypt, src/main/kdf.js) and kept as "<name>.cnlock" in the uploads folder; the plain file is
// removed. While the note is open the renderer hands its password here for them: the capnote-file
// protocol decrypts the images in memory to show them, and an attached file opened with its
// program is decrypted into a private temporary folder that goes when the note locks again or the
// app closes. Locking the note again forgets the password. Taking the lock off writes the plain
// files back.
//
// File layout: "CNL2", log2(N), r, p, a 16-byte salt, a 12-byte IV, the 16-byte tag, the data.
// Files of older versions ("CNL1": salt, IV, tag, data; PBKDF2-SHA256) are still read and are
// encrypted again as CNL2 when their note opens.

import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import { app, ipcMain } from 'electron';
import { uploadsDir } from './paths.js';
import { safeUploadName } from './upload-names.js';
import { scryptKey, SCRYPT } from './kdf.js';

const SUFFIX = '.cnlock';
const MAGIC_V1 = Buffer.from('CNL1');
const MAGIC_V2 = Buffer.from('CNL2');
const PBKDF2_ITERATIONS = 210000;
const IMAGE = /\.(png|jpe?g|gif|webp|bmp|svg|avif|ico)$/i;
const TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  ico: 'image/x-icon',
};

// name -> password, for the files of the locked notes open now
const openPasswords = new Map();
// name -> decrypted bytes, while open (each image is decrypted once)
const openCache = new Map();
// name -> the decrypted copy of an attached file opened with its program
const openCopies = new Map();
// A private folder for those copies, made on first use
let copiesDir = null;

const safeName = safeUploadName;
const plainPath = (name) => path.join(uploadsDir(), name);
const lockedPath = (name) => path.join(uploadsDir(), name + SUFFIX);
const isImageName = (name) => IMAGE.test(name);

const pbkdf2 = promisify(crypto.pbkdf2);

// Keys are derived once per password and salt (scrypt takes most of a second on purpose): the
// files sealed together share a salt, each with its own IV
const keyCache = new Map();
const sessionSalts = new Map();

function cachedKey(id, derive) {
  if (!keyCache.has(id)) {
    const promise = derive();
    keyCache.set(id, promise);
    promise.catch(() => keyCache.delete(id));
    if (keyCache.size > 64) keyCache.delete(keyCache.keys().next().value);
  }
  return keyCache.get(id);
}

const v2Key = (password, salt, params) =>
  cachedKey(`2:${params.N}:${params.r}:${params.p}:${salt.toString('hex')}:${password}`, () =>
    scryptKey(password, salt, params)
  );

const v1Key = (password, salt) =>
  cachedKey(`1:${salt.toString('hex')}:${password}`, () =>
    pbkdf2(String(password), salt, PBKDF2_ITERATIONS, 32, 'sha256')
  );

async function encryptBytes(bytes, password) {
  let salt = sessionSalts.get(password);
  if (!salt) {
    salt = crypto.randomBytes(16);
    sessionSalts.set(password, salt);
  }
  const iv = crypto.randomBytes(12);
  const key = await v2Key(password, salt, SCRYPT);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(bytes), cipher.final()]);
  const params = Buffer.from([Math.log2(SCRYPT.N), SCRYPT.r, SCRYPT.p]);
  return Buffer.concat([MAGIC_V2, params, salt, iv, cipher.getAuthTag(), data]);
}

const isV1 = (file) => file.length >= 48 && file.subarray(0, 4).equals(MAGIC_V1);

// Throws when the password is wrong or the file is damaged
async function decryptBytes(file, password) {
  let key;
  let at;
  if (file.length >= 51 && file.subarray(0, 4).equals(MAGIC_V2)) {
    const params = { N: 2 ** file[4], r: file[5], p: file[6] };
    key = await v2Key(password, file.subarray(7, 23), params);
    at = 23;
  } else if (isV1(file)) {
    key = await v1Key(password, file.subarray(4, 20));
    at = 20;
  } else {
    throw new Error('Not a locked file');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, file.subarray(at, at + 12));
  decipher.setAuthTag(file.subarray(at + 12, at + 28));
  return Buffer.concat([decipher.update(file.subarray(at + 28)), decipher.final()]);
}

// Everything locks: no key stays in memory
function forgetKeys() {
  keyCache.clear();
  sessionSalts.clear();
}

// Write next to the target, then move over it, so a failed write never leaves half a file
function writeSafely(target, bytes) {
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, target);
}

// Encrypt the plain image files among these names; they stay viewable while the note is open
async function sealImages(names, password, { keepOpen = true } = {}) {
  const sealed = [];
  for (const raw of Array.isArray(names) ? names : []) {
    const name = safeName(raw);
    if (!name || !password) continue;
    try {
      if (fs.existsSync(plainPath(name))) {
        const bytes = fs.readFileSync(plainPath(name));
        writeSafely(lockedPath(name), await encryptBytes(bytes, password));
        fs.rmSync(plainPath(name), { force: true });
        if (keepOpen && isImageName(name)) openCache.set(name, bytes);
        sealed.push(name);
      }
      if (keepOpen && fs.existsSync(lockedPath(name))) openPasswords.set(name, password);
    } catch (err) {
      console.error('Encrypting an image failed:', name, err);
    }
  }
  return sealed;
}

// Decrypt these images back into plain files (the note's lock was taken off)
async function unsealImages(names, password) {
  const opened = [];
  for (const raw of Array.isArray(names) ? names : []) {
    const name = safeName(raw);
    if (!name || !fs.existsSync(lockedPath(name))) continue;
    try {
      const bytes = await decryptBytes(fs.readFileSync(lockedPath(name)), password);
      writeSafely(plainPath(name), bytes);
      fs.rmSync(lockedPath(name), { force: true });
      opened.push(name);
    } catch (err) {
      console.error('Decrypting an image failed:', name, err);
    }
    openPasswords.delete(name);
    openCache.delete(name);
    removeOpenCopy(name);
  }
  return opened;
}

// A note opened with its password: its files can be read; those written by an older version are
// encrypted again with the current key derivation
async function openImages(names, password) {
  for (const raw of Array.isArray(names) ? names : []) {
    const name = safeName(raw);
    if (!name || !password || !fs.existsSync(lockedPath(name))) continue;
    openPasswords.set(name, password);
    try {
      const file = fs.readFileSync(lockedPath(name));
      if (isV1(file)) {
        const bytes = await decryptBytes(file, password);
        writeSafely(lockedPath(name), await encryptBytes(bytes, password));
      }
    } catch (err) {
      console.error('Upgrading a locked file failed:', name, err);
    }
  }
}

function closeImages(names) {
  (Array.isArray(names) ? names : []).forEach((raw) => {
    const name = safeName(raw);
    if (!name) return;
    openPasswords.delete(name);
    openCache.delete(name);
    removeOpenCopy(name);
  });
}

// ---- Attached files of an open locked note, opened with their program or saved elsewhere

function removeOpenCopy(name) {
  const copy = openCopies.get(name);
  if (!copy) return;
  openCopies.delete(name);
  fs.rmSync(path.dirname(copy), { recursive: true, force: true });
}

// The decrypted bytes of a locked file of an open note; null when it is not locked here
async function openLockedBytes(name) {
  const safe = safeName(name);
  if (!safe || !fs.existsSync(lockedPath(safe))) return null;
  const password = openPasswords.get(safe);
  if (!password) throw new Error('locked');
  return decryptBytes(fs.readFileSync(lockedPath(safe)), password);
}

// A decrypted copy to open with its program, under its own name, in a private temporary folder
async function openLockedCopy(name, title) {
  const bytes = await openLockedBytes(name);
  if (!bytes) return null;
  removeOpenCopy(name);
  if (!copiesDir) {
    copiesDir = fs.mkdtempSync(path.join(os.tmpdir(), `capnote-open-${process.pid}-`));
  }
  const dir = fs.mkdtempSync(path.join(copiesDir, 'f-'));
  // Its own name, without what Windows does not allow in one (and no control characters)
  const base =
    [...path.basename(String(title || ''))]
      .map((ch) => (/[<>:"/\\|?*]/.test(ch) || ch.charCodeAt(0) < 32 ? '_' : ch))
      .join('') || name;
  const file = path.join(dir, base);
  fs.writeFileSync(file, bytes);
  openCopies.set(name, file);
  return file;
}

// Decrypted copies left by an earlier run (a crash) and this run's at its end
function removeAllOpenCopies() {
  openCopies.clear();
  if (copiesDir) fs.rmSync(copiesDir, { recursive: true, force: true });
  copiesDir = null;
  try {
    fs.readdirSync(os.tmpdir())
      .filter((entry) => entry.startsWith('capnote-open-'))
      .forEach((entry) =>
        fs.rmSync(path.join(os.tmpdir(), entry), { recursive: true, force: true })
      );
  } catch {}
}

// For the capnote-file protocol: an encrypted image of an open note, decrypted in memory
async function lockedImageResponse(name) {
  const safe = safeName(name);
  if (!safe || !fs.existsSync(lockedPath(safe))) return null;
  const password = openPasswords.get(safe);
  if (!password) return new Response('Locked', { status: 403 });
  try {
    let bytes = openCache.get(safe);
    if (!bytes) {
      bytes = await decryptBytes(fs.readFileSync(lockedPath(safe)), password);
      openCache.set(safe, bytes);
    }
    const ext = path.extname(safe).slice(1).toLowerCase();
    return new Response(bytes, {
      headers: { 'Content-Type': TYPES[ext] || 'application/octet-stream' },
    });
  } catch {
    return new Response('Locked', { status: 403 });
  }
}

// Plain copies, under new names, of the images of a locked note open now: old name -> new name
async function copyOpenImages(names) {
  const copies = {};
  for (const raw of Array.isArray(names) ? names : []) {
    const name = safeName(raw);
    const password = name && openPasswords.get(name);
    if (!password || !fs.existsSync(lockedPath(name))) continue;
    try {
      const bytes =
        openCache.get(name) || (await decryptBytes(fs.readFileSync(lockedPath(name)), password));
      const plain = name.replace(/^\d+-[a-z0-9]+-/, '');
      const copy = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${plain}`;
      writeSafely(plainPath(copy), bytes);
      copies[name] = copy;
    } catch (err) {
      console.error('Copying an image failed:', name, err);
    }
  }
  return copies;
}

function registerLockedImagesIpc() {
  ipcMain.handle('locked-images:copy', (event, names) => copyOpenImages(names));
  ipcMain.handle('locked-images:seal', (event, { names, password } = {}) =>
    sealImages(names, password)
  );
  ipcMain.handle('locked-images:unseal', (event, { names, password } = {}) =>
    unsealImages(names, password)
  );
  ipcMain.handle('locked-images:open', async (event, { names, password } = {}) => {
    await openImages(names, password);
    return true;
  });
  ipcMain.handle('locked-images:close', (event, names) => {
    closeImages(names);
    return true;
  });
  // Everything locked: the keys and the decrypted copies go
  ipcMain.handle('locked-images:forget', () => {
    forgetKeys();
    openPasswords.clear();
    openCache.clear();
    [...openCopies.keys()].forEach(removeOpenCopy);
    return true;
  });
  removeAllOpenCopies();
  app.on('will-quit', removeAllOpenCopies);
}

export {
  registerLockedImagesIpc,
  lockedImageResponse,
  openLockedBytes,
  openLockedCopy,
  sealImages,
  unsealImages,
  openImages,
  closeImages,
  SUFFIX as LOCKED_IMAGE_SUFFIX,
};
