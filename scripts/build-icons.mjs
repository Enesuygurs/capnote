// Renders the icon sources in assets/icons/source into the PNG and ICO files the app and installer use.
// Run with `npm run icons` (it needs Electron to rasterize the SVGs).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { app, BrowserWindow } from 'electron';

const ICONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'icons');
const SOURCE_DIR = path.join(ICONS_DIR, 'source');

// The detailed icon from 48 px up; the simplified one below that, where detail turns into noise
const SMALL_SOURCE_MAX = 32;
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

const PNG_OUTPUTS = [
  { file: 'capnote-512.png', source: 'capnote.svg', size: 512 },
  { file: 'capnote-32.png', source: 'capnote-small.svg', size: 32 },
  { file: 'capnote-16.png', source: 'capnote-small.svg', size: 16 },
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
    const source = size <= SMALL_SOURCE_MAX ? 'capnote-small.svg' : 'capnote.svg';
    icoImages.push({ size, png: await rasterize(win, source, size) });
  }
  fs.writeFileSync(path.join(ICONS_DIR, 'capnote.ico'), buildIco(icoImages));
  console.log(`capnote.ico (${ICO_SIZES.join(', ')}px)`);

  app.exit(0);
});
