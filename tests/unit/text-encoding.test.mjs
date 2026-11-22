// Text files written back as they were: encoding (UTF-8, its BOM, UTF-16, the Turkish code page)
// and line ends (CRLF or LF)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readText, writeText, detectTextFormat } from '../../src/main/text-encoding.js';

const roundTrip = (bytes, edit = (t) => t) => {
  const { text, format } = readText(bytes);
  return { text, format, out: writeText(edit(text), format) };
};

test('UTF-8 with CRLF line ends: read with "\n", written back with CRLF, byte for byte', () => {
  const bytes = Buffer.from('@echo off\r\necho merhaba\r\n', 'utf8');
  const { text, format, out } = roundTrip(bytes);
  assert.equal(text, '@echo off\necho merhaba\n');
  assert.deepEqual(format, { encoding: 'utf8', bom: false, eol: '\r\n' });
  assert.ok(out.equals(bytes));
});

test('UTF-8 with a byte order mark keeps it; LF files stay LF', () => {
  const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('a\nb\n', 'utf8')]);
  const { text, out } = roundTrip(bytes);
  assert.equal(text, 'a\nb\n');
  assert.ok(out.equals(bytes));
});

test('UTF-16 (a .reg file Windows exports) is read and written back as UTF-16', () => {
  const source = 'Windows Registry Editor Version 5.00\r\n\r\n"a"="ş"\r\n';
  const bytes = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(source, 'utf16le')]);
  const { text, format, out } = roundTrip(bytes, (t) => t + 'x');
  assert.equal(text, source.replace(/\r\n/g, '\n'));
  assert.equal(format.encoding, 'utf16le');
  assert.ok(
    out.equals(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(source + 'x', 'utf16le')]))
  );
});

test('a Turkish "ANSI" file (code page 1254) keeps its letters and its encoding', () => {
  // "ad;şehir\r\nAyşe;İzmir\r\n" in code page 1254
  const bytes = Buffer.from([
    0x61, 0x64, 0x3b, 0xfe, 0x65, 0x68, 0x69, 0x72, 0x0d, 0x0a, 0x41, 0x79, 0xfe, 0x65, 0x3b, 0xdd,
    0x7a, 0x6d, 0x69, 0x72, 0x0d, 0x0a,
  ]);
  const { text, format, out } = roundTrip(bytes);
  assert.equal(text, 'ad;şehir\nAyşe;İzmir\n');
  assert.equal(format.encoding, 'ansi');
  assert.ok(out.equals(bytes));
});

test('text the code page cannot hold is written as UTF-8 with a BOM, nothing lost', () => {
  const format = detectTextFormat(Buffer.from([0x41, 0xfe, 0x0d, 0x0a]));
  const out = writeText('Aş 😀\n', format);
  assert.deepEqual([...out.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.equal(readText(out).text, 'Aş 😀\n');
});
