// Locations used by the main process

const path = require('path');
const { app } = require('electron');

const SRC_DIR = path.join(__dirname, '..');
const ICONS_DIR = path.join(SRC_DIR, '..', 'assets', 'icons');
const RENDERER_DIR = path.join(SRC_DIR, 'renderer');
const PRELOAD_FILE = path.join(SRC_DIR, 'preload.js');

function uploadsDir() {
  return path.join(app.getPath('userData'), 'uploads');
}

module.exports = { ICONS_DIR, RENDERER_DIR, PRELOAD_FILE, uploadsDir };
