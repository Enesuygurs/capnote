// The key of a locked note, folder or file: scrypt from its password (memory-hard: every guess
// costs 128 MB of memory and most of a second, so guessing passwords with graphics cards is slow
// and dear). Node's crypto runs it off the main thread. Electron's Node has no Argon2 (its
// BoringSSL leaves it out), so scrypt is the memory-hard choice here.

import crypto from 'crypto';
import { ipcMain } from 'electron';

// OWASP's recommendation for scrypt: N = 2^17, r = 8, p = 1 (128 MB)
export const SCRYPT = { N: 2 ** 17, r: 8, p: 1 };
const KEY_BYTES = 32;

// Parameters from a stored payload, within sane bounds (a damaged or crafted one cannot ask for
// gigabytes of memory)
function checkedParams({ N, r, p } = {}) {
  const n = Number(N);
  const rr = Number(r);
  const pp = Number(p);
  const powerOfTwo = Number.isInteger(n) && n >= 2 ** 14 && n <= 2 ** 20 && (n & (n - 1)) === 0;
  if (!powerOfTwo || !Number.isInteger(rr) || rr < 1 || rr > 16 || !Number.isInteger(pp)) {
    throw new Error('Bad key parameters');
  }
  if (pp < 1 || pp > 4) throw new Error('Bad key parameters');
  return { N: n, r: rr, p: pp };
}

export function scryptKey(password, salt, params = SCRYPT) {
  const { N, r, p } = checkedParams(params);
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      String(password),
      salt,
      KEY_BYTES,
      { N, r, p, maxmem: 128 * N * r * 2 },
      (err, key) => (err ? reject(err) : resolve(key))
    );
  });
}

export function registerKdfIpc() {
  // The page asks for a key (its AES-GCM runs in the page); the password never leaves the app
  ipcMain.handle('crypto:scrypt-key', async (event, password, saltBase64, params) => {
    if (typeof password !== 'string' || typeof saltBase64 !== 'string') return null;
    const salt = Buffer.from(saltBase64, 'base64');
    if (salt.length < 16) return null;
    const key = await scryptKey(password, salt, params);
    return new Uint8Array(key);
  });
}
