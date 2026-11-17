// The data files: written atomically with the previous version kept, a damaged file read from
// that previous version, unknown collections refused
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { JsonStore } from '../../src/main/storage.js';

const freshStore = () => new JsonStore(fs.mkdtempSync(path.join(os.tmpdir(), 'capnote-store-')));

test('a new store is not initialized until something is written', () => {
  const store = freshStore();
  assert.equal(store.isInitialized(), false);
  store.write('folders', []);
  assert.equal(store.isInitialized(), true);
});

test('a write keeps the previous version as .bak and leaves no temp file', () => {
  const store = freshStore();
  store.write('folders', [{ id: 1 }]);
  store.write('folders', [{ id: 2 }]);
  const file = store.fileFor('folders');
  assert.deepEqual(store.read('folders'), [{ id: 2 }]);
  assert.deepEqual(JSON.parse(fs.readFileSync(`${file}.bak`, 'utf8')), [{ id: 1 }]);
  assert.equal(fs.existsSync(`${file}.tmp`), false);
});

test('a damaged file is read from its previous version', () => {
  const store = freshStore();
  store.write('folders', [{ id: 1 }]);
  store.write('folders', [{ id: 2 }]);
  fs.writeFileSync(store.fileFor('folders'), '[{"id": 2', 'utf8');
  assert.deepEqual(store.read('folders'), [{ id: 1 }]);
});

test('a collection that does not exist is refused', () => {
  assert.throws(() => freshStore().fileFor('../../evil'), /Unknown collection/);
});
