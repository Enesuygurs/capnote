// Folder colors: one family of distinct tones, and a new folder takes the hue farthest from the
// ones in use
import test from 'node:test';
import assert from 'node:assert/strict';
import { FOLDER_PALETTE, hueOf, nextFolderColor } from '../../src/renderer/js/folder-palette.js';

test('sixteen different colors, all valid hex', () => {
  assert.equal(FOLDER_PALETTE.length, 16);
  assert.equal(new Set(FOLDER_PALETTE).size, 16);
  FOLDER_PALETTE.forEach((c) => assert.match(c, /^#[0-9A-F]{6}$/));
});

test('the first folder gets the first color, the second one far from it in hue', () => {
  const first = nextFolderColor([]);
  const second = nextFolderColor([first]);
  assert.equal(first, FOLDER_PALETTE[0]);
  const gap = Math.abs(hueOf(first) - hueOf(second)) % 360;
  assert.ok(Math.min(gap, 360 - gap) >= 150);
});

test('sixteen folders get sixteen colors; the seventeenth repeats the least used', () => {
  const used = [];
  for (let i = 0; i < 16; i++) used.push(nextFolderColor(used));
  assert.equal(new Set(used).size, 16);
  assert.ok(FOLDER_PALETTE.includes(nextFolderColor(used)));
});

test('a gray or a non-color has no hue', () => {
  assert.equal(hueOf('#808080'), null);
  assert.equal(hueOf('nope'), null);
});
