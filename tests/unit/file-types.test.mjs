// Which files "Edit with Capnote" opens: by extension, a name that is only an extension included
import test from 'node:test';
import assert from 'node:assert/strict';
import { EXTENSIONS, extensionOf, isSupportedFile } from '../../src/main/file-types.js';

test('the extension is the last part of the name, in lower case', () => {
  assert.equal(extensionOf(String.raw`C:\Docs\Notes.MD`), '.md');
  assert.equal(extensionOf('/home/me/app.config.json'), '.json');
  assert.equal(extensionOf('README'), '');
});

test('a name that is only an extension is its own extension (.env)', () => {
  assert.equal(extensionOf(String.raw`C:\proj\.env`), '.env');
  assert.equal(isSupportedFile('/proj/.env'), true);
  assert.equal(isSupportedFile('/proj/prod.env'), true);
});

test('every listed extension is supported and a binary file is not', () => {
  for (const ext of EXTENSIONS) assert.equal(isSupportedFile(`file${ext}`), true, ext);
  for (const name of ['photo.png', 'app.exe', 'archive.zip', 'doc.pdf', 'noextension'])
    assert.equal(isSupportedFile(name), false, name);
});
