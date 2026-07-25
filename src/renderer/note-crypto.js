// note-crypto.js - Password-based encryption for locked notes (PBKDF2-SHA256 + AES-GCM via Web Crypto)

(() => {
  const ITERATIONS = 210000;
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

  async function deriveKey(password, salt, iterations) {
    const baseKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
      'deriveKey',
    ]);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encrypt(text, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt, ITERATIONS);
    const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text)));
    return {
      v: 1,
      iterations: ITERATIONS,
      salt: toBase64(salt),
      iv: toBase64(iv),
      data: toBase64(data),
    };
  }

  // Throws when the password is wrong (AES-GCM authentication fails) or the payload is corrupt
  async function decrypt(payload, password) {
    if (!payload || payload.v !== 1) throw new Error('Unsupported encrypted payload');
    const key = await deriveKey(password, fromBase64(payload.salt), payload.iterations || ITERATIONS);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv) }, key, fromBase64(payload.data));
    return decoder.decode(plain);
  }

  window.NoteCrypto = { encrypt, decrypt };
})();
