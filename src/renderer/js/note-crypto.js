// note-crypto.js - Password-based encryption for locked notes and folders: AES-256-GCM, with the
// key from the password by scrypt (memory-hard; in the main process, src/main/kdf.js).
//
// Payloads: { v: 2, kdf: 'scrypt', N, r, p, salt, iv, data } now; { v: 1, iterations, salt, iv,
// data } (PBKDF2-SHA256) from older versions, still read, and written again as v2 when the note
// opens (needsUpgrade).
//
// Deriving a key costs most of a second on purpose, so a key is derived once per password and salt
// and kept in memory while it is in use: encryptions with the same password share one salt (each
// with its own random IV, which is what AES-GCM needs), so saving an open note, or locking a folder
// of many notes, derives nothing new. forgetKeys() drops them all (everything locks).

const PBKDF2_ITERATIONS = 210000;
const SCRYPT = { N: 2 ** 17, r: 8, p: 1 };
const KEY_CACHE_LIMIT = 64;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (bytes) => {
  let binary = '';
  // Chunked to stay below the argument limit of String.fromCharCode for large notes
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

const fromBase64 = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

// salt + password -> AES key (a promise, so two requests for one key derive it once)
const keyCache = new Map();
// password -> the salt new encryptions with it use
const sessionSalts = new Map();

const cacheKey = (kind, salt, password) => `${kind}\u0000${salt}\u0000${password}`;

function remember(id, promise) {
  keyCache.set(id, promise);
  if (keyCache.size > KEY_CACHE_LIMIT) keyCache.delete(keyCache.keys().next().value);
  // A failed derivation is not kept
  promise.catch(() => keyCache.delete(id));
  return promise;
}

async function pbkdf2Key(password, salt, iterations) {
  const baseKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(salt), iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function scryptAesKey(password, salt, params) {
  const raw = await window.electronAPI.crypto.scryptKey(password, salt, params);
  if (!raw) throw new Error('No key');
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function keyFor(payload, password) {
  if (payload.v === 2) {
    const id = cacheKey(`s${payload.N}.${payload.r}.${payload.p}`, payload.salt, password);
    if (keyCache.has(id)) return keyCache.get(id);
    return remember(id, scryptAesKey(password, payload.salt, payload));
  }
  const iterations = payload.iterations || PBKDF2_ITERATIONS;
  const id = cacheKey(`p${iterations}`, payload.salt, password);
  if (keyCache.has(id)) return keyCache.get(id);
  return remember(id, pbkdf2Key(password, payload.salt, iterations));
}

export async function encrypt(text, password) {
  let salt = sessionSalts.get(password);
  if (!salt) {
    salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
    sessionSalts.set(password, salt);
  }
  const header = { v: 2, kdf: 'scrypt', ...SCRYPT, salt };
  const key = await keyFor(header, password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text))
  );
  return { ...header, iv: toBase64(iv), data: toBase64(data) };
}

// Throws when the password is wrong (AES-GCM authentication fails) or the payload is corrupt
export async function decrypt(payload, password) {
  if (!payload || (payload.v !== 1 && payload.v !== 2)) {
    throw new Error('Unsupported encrypted payload');
  }
  if (payload.v === 2 && payload.kdf !== 'scrypt') throw new Error('Unsupported encrypted payload');
  const key = await keyFor(payload, password);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.data)
  );
  return decoder.decode(plain);
}

// Written by an older version (PBKDF2): encrypted again the next time it is open
export function needsUpgrade(payload) {
  return !!payload && payload.v !== 2;
}

// Everything locks: no key stays in memory
export function forgetKeys() {
  keyCache.clear();
  sessionSalts.clear();
}
