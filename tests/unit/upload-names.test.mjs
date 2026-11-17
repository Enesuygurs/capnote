// Upload file names: only plain names from the renderer, and new names that keep files apart
import test from 'node:test';
import assert from 'node:assert/strict';
import { safeUploadName, newUploadName } from '../../src/main/upload-names.js';

test('a plain file name is accepted as it is', () => {
  assert.equal(safeUploadName('123-abc-photo.png'), '123-abc-photo.png');
});

test('a path, "." or ".." or something not a string is refused', () => {
  const windowsPath = String.raw`a\b.png`;
  for (const name of ['../secret.txt', 'a/b.png', windowsPath, '.', '..', '', null, 42, {}]) {
    assert.equal(safeUploadName(name), null, String(name));
  }
});

test('a new name has a timestamp, a random part and only safe characters', () => {
  const name = newUploadName('/home/me/Tatil fotoğrafı (1).jpg', 1700000000000);
  assert.match(name, /^1700000000000-[a-z0-9]{1,6}-Tatil_fotoğrafı__1_\.jpg$/);
  assert.equal(safeUploadName(name), name);
});

test('two files with the same name get different names', () => {
  assert.notEqual(newUploadName('a.png', 1), newUploadName('a.png', 1));
});
