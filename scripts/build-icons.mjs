// Renders the icon sources in assets/icons/source into the PNG and ICO files the app and installer use.
// Run with `npm run icons` (it needs Electron to rasterize the SVGs).

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { app, BrowserWindow } from 'electron';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICONS_DIR = path.join(ROOT, 'assets', 'icons');
const SOURCE_DIR = path.join(ICONS_DIR, 'source');

// The icons of the tray menu's rows (Windows): the app's Font Awesome icons in a gray for the light
// and one for the dark theme, 16px and 32px (name@2x.png, which Electron picks on scaled screens)
const MENU_DIR = path.join(ICONS_DIR, 'menu');
const MENU_ICONS = {
  show: 'far fa-window-maximize',
  hide: 'far fa-eye-slash',
  newNote: 'fas fa-plus',
  quickNote: 'fas fa-bolt',
  recent: 'far fa-clock',
  note: 'far fa-file-lines',
  notifications: 'far fa-bell',
  settings: 'fas fa-gear',
  quit: 'fas fa-power-off',
};
const MENU_ICON_COLORS = { light: '#5b6472', dark: '#c8c8c8' };

async function buildMenuIcons() {
  const css = pathToFileURL(
    path.join(ROOT, 'node_modules', '@fortawesome', 'fontawesome-free', 'css', 'all.min.css')
  ).href;
  // A file page, so the icon font loads
  const page = path.join(os.tmpdir(), `capnote-menu-icons-${process.pid}.html`);
  const glyphs = Object.values(MENU_ICONS)
    .map((cls) => `<i class="${cls}"></i>`)
    .join('');
  fs.writeFileSync(
    page,
    `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${css}">${glyphs}`
  );
  const win = new BrowserWindow({ show: false });
  try {
    await win.loadFile(page);
    fs.mkdirSync(MENU_DIR, { recursive: true });
    for (const [theme, color] of Object.entries(MENU_ICON_COLORS)) {
      for (const [suffix, size] of [
        ['', 16],
        ['@2x', 32],
      ]) {
        const urls = await win.webContents.executeJavaScript(`(async () => {
          await document.fonts.ready;
          return [...document.querySelectorAll('i')].map((el) => {
            const st = getComputedStyle(el, '::before');
            // The glyph in quotes, maybe followed by an alt text: the glyph only
            const glyph = [...st.content.replace(/^["']/, '')][0];
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = ${size};
            const g = canvas.getContext('2d');
            const family = st.fontFamily.split(',')[0].replace(/["']/g, '');
            g.font = st.fontWeight + ' ${Math.round(size * 0.75)}px "' + family + '"';
            g.fillStyle = ${JSON.stringify(color)};
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText(glyph, ${size / 2}, ${size / 2 + size / 32});
            return canvas.toDataURL('image/png');
          });
        })()`);
        Object.keys(MENU_ICONS).forEach((name, i) => {
          const file = path.join(MENU_DIR, `${name}-${theme}${suffix}.png`);
          fs.writeFileSync(file, Buffer.from(urls[i].split(',')[1], 'base64'));
        });
      }
    }
    console.log(`menu/ (${Object.keys(MENU_ICONS).length} icons, light and dark, 16 and 32px)`);
  } finally {
    win.destroy();
    fs.rmSync(page, { force: true });
  }
}

// Every size is drawn from the one app icon, the same one the app shows in its sidebar
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

const PNG_OUTPUTS = [
  { file: 'capnote-512.png', source: 'capnote.svg', size: 512 },
  { file: 'capnote-32.png', source: 'capnote.svg', size: 32 },
  { file: 'capnote-16.png', source: 'capnote.svg', size: 16 },
  // macOS loads the @2x file automatically on Retina screens
  { file: 'trayTemplate.png', source: 'tray-template.svg', size: 16 },
  { file: 'trayTemplate@2x.png', source: 'tray-template.svg', size: 32 },
];

// Draws an SVG onto a canvas at the exact pixel size and returns PNG bytes
async function rasterize(win, svgFile, size) {
  const svg = fs.readFileSync(path.join(SOURCE_DIR, svgFile), 'utf8');
  const dataUrl = await win.webContents.executeJavaScript(`(async () => {
    const img = new Image();
    img.src = ${JSON.stringify('data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'))};
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = ${size};
    canvas.getContext('2d').drawImage(img, 0, 0, ${size}, ${size});
    return canvas.toDataURL('image/png');
  })()`);
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

// An ICO file can hold PNG images directly: a header, one directory entry per size, then the images
function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('data:text/html,<!doctype html><title>icons</title>');

  for (const { file, source, size } of PNG_OUTPUTS) {
    fs.writeFileSync(path.join(ICONS_DIR, file), await rasterize(win, source, size));
    console.log(`${file} (${size}px)`);
  }

  const icoImages = [];
  for (const size of ICO_SIZES) {
    icoImages.push({ size, png: await rasterize(win, 'capnote.svg', size) });
  }
  fs.writeFileSync(path.join(ICONS_DIR, 'capnote.ico'), buildIco(icoImages));
  console.log(`capnote.ico (${ICO_SIZES.join(', ')}px)`);

  await buildMenuIcons();

  app.exit(0);
});
