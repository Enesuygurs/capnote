// Locations used by the main process

import path from 'path';
import { fileURLToPath } from 'url';
import { app } from 'electron';

const SRC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICONS_DIR = path.join(SRC_DIR, '..', 'assets', 'icons');
const RENDERER_DIR = path.join(SRC_DIR, 'renderer');
// CommonJS because sandboxed preload scripts cannot be ES modules
const PRELOAD_FILE = path.join(SRC_DIR, 'preload.cjs');

function uploadsDir() {
  return path.join(app.getPath('userData'), 'uploads');
}

export { ICONS_DIR, RENDERER_DIR, PRELOAD_FILE, uploadsDir };
