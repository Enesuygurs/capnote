// Names of the files in the uploads folder. A name that comes from the renderer is only accepted
// as a plain file name (no folder, no "." or ".."); a file copied in gets a new name that keeps
// files apart and reads the same in every URL. Pure functions, so they are tested without Electron.

import path from 'path';

// The name itself, or null when it is not a plain file name
export function safeUploadName(name) {
  if (typeof name !== 'string') return null;
  const base = path.basename(name);
  return base && base === name && base !== '.' && base !== '..' ? base : null;
}

// A new name for a file copied in: a timestamp and a random part, then its own name with only
// letters, digits, dot, dash and underscore
export function newUploadName(originalName, now = Date.now()) {
  const plain = path.basename(String(originalName || 'file')).replace(/[^\p{L}\p{N}._-]/gu, '_');
  return `${now}-${Math.random().toString(36).slice(2, 8)}-${plain}`;
}
