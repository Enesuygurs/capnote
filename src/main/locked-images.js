// Images of locked notes. When a note is locked, the image files it shows are encrypted with its
// password (AES-256-GCM, the key from the password with PBKDF2-SHA256) and kept as
// "<name>.cnlock" in the uploads folder; the plain file is removed. While the note is open the
// renderer hands its password here for those images, and the capnote-file protocol decrypts them
// in memory to show them; nothing decrypted is written to disk. Locking the note again forgets
// the password. Taking the lock off writes the plain files back.

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { ipcMain } from 'electron';
import { uploadsDir } from './paths.js';

const SUFFIX = '.cnlock';
const MAGIC = Buffer.from('CNL1');
const ITERATIONS = 210000;
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

// name -> password, for the images of the locked notes open now
const openPasswords = new Map();
// name -> decrypted bytes, while open (each image is decrypted once)
const openCache = new Map();

const safeName = (name) => {
  if (typeof name !== 'string') return null;
  const base = path.basename(name);
  return base && base === name && base !== '.' && base !== '..' ? base : null;
};
const plainPath = (name) => path.join(uploadsDir(), name);
const lockedPath = (name) => path.join(uploadsDir(), name + SUFFIX);
const isImageName = (name) => IMAGE.test(name);

const pbkdf2 = promisify(crypto.pbkdf2);

// Off the main thread, so the window does not wait while many images are encrypted
function deriveKey(password, salt) {
  return pbkdf2(String(password), salt, ITERATIONS, 32, 'sha256');
}

async function encryptBytes(bytes, password) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', await deriveKey(password, salt), iv);
  const data = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), data]);
}

// Throws when the password is wrong or the file is damaged
async function decryptBytes(file, password) {
  if (file.length < 48 || !file.subarray(0, 4).equals(MAGIC)) throw new Error('Not a locked image');
  const salt = file.subarray(4, 20);
  const iv = file.subarray(20, 32);
  const tag = file.subarray(32, 48);
  const decipher = crypto.createDecipheriv('aes-256-gcm', await deriveKey(password, salt), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(file.subarray(48)), decipher.final()]);
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
    if (!name || !isImageName(name) || !password) continue;
    try {
      if (fs.existsSync(plainPath(name))) {
        const bytes = fs.readFileSync(plainPath(name));
        writeSafely(lockedPath(name), await encryptBytes(bytes, password));
        fs.rmSync(plainPath(name), { force: true });
        if (keepOpen) openCache.set(name, bytes);
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
  }
  return opened;
}

function openImages(names, password) {
  (Array.isArray(names) ? names : []).forEach((raw) => {
    const name = safeName(raw);
    if (name && password && fs.existsSync(lockedPath(name))) openPasswords.set(name, password);
  });
}

function closeImages(names) {
  (Array.isArray(names) ? names : []).forEach((raw) => {
    const name = safeName(raw);
    if (!name) return;
    openPasswords.delete(name);
    openCache.delete(name);
  });
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
  ipcMain.handle('locked-images:open', (event, { names, password } = {}) => {
    openImages(names, password);
    return true;
  });
  ipcMain.handle('locked-images:close', (event, names) => {
    closeImages(names);
    return true;
  });
}

export {
  registerLockedImagesIpc,
  lockedImageResponse,
  sealImages,
  unsealImages,
  openImages,
  closeImages,
  SUFFIX as LOCKED_IMAGE_SUFFIX,
};
