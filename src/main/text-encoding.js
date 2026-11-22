// How a text file is written: its encoding and its line ends, so a file read into a note is written
// back the way it was. UTF-8 (with or without a byte order mark), UTF-16 (a .reg file exported by
// Windows is UTF-16) and, for a file that is not valid UTF-8, the Turkish Windows code page 1254
// (files saved as "ANSI" by Excel or Notepad); line ends stay CRLF or LF as the file had them.
// The note always holds the text with plain "\n" line ends. Pure functions, tested without Electron.

const ANSI = 'windows-1254';

// The bytes of code page 1254, from its own decoder: character -> byte
let ansiBytes = null;
function ansiTable() {
  if (ansiBytes) return ansiBytes;
  const decoder = new TextDecoder(ANSI);
  ansiBytes = new Map();
  for (let byte = 0; byte < 256; byte++) {
    const char = decoder.decode(Uint8Array.of(byte));
    if (char !== '\ufffd' && !ansiBytes.has(char)) ansiBytes.set(char, byte);
  }
  return ansiBytes;
}

// { encoding: 'utf8' | 'utf16le' | 'utf16be' | 'ansi', bom, eol: '\r\n' | '\n' }
export function detectTextFormat(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let encoding = 'utf8';
  let bom = false;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) bom = true;
  else if (bytes[0] === 0xff && bytes[1] === 0xfe) [encoding, bom] = ['utf16le', true];
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) [encoding, bom] = ['utf16be', true];
  else {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      encoding = 'ansi';
    }
  }
  const text = decodeText(bytes, { encoding, bom });
  return { encoding, bom, eol: text.includes('\r\n') ? '\r\n' : '\n' };
}

// The file's text (its byte order mark left out), line ends as they are
function decodeText(bytes, { encoding, bom }) {
  const label = { utf8: 'utf-8', utf16le: 'utf-16le', utf16be: 'utf-16be', ansi: ANSI }[encoding];
  // The decoder drops a byte order mark itself (ignoreBOM: false)
  const text = new TextDecoder(label).decode(bytes);
  return bom && text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

// The file's text for the note: decoded, with "\n" line ends
export function readText(buffer) {
  const format = detectTextFormat(buffer);
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return { text: decodeText(bytes, format).replace(/\r\n/g, '\n'), format };
}

// The note's text as the file's bytes, in the file's encoding and with its line ends. Text that
// code page 1254 cannot hold (an emoji, say) is written as UTF-8 with a byte order mark instead,
// so nothing is lost.
export function writeText(text, format = { encoding: 'utf8', bom: false, eol: '\n' }) {
  const body = String(text).replace(/\r?\n/g, format.eol || '\n');
  if (format.encoding === 'utf16le' || format.encoding === 'utf16be') {
    const out = Buffer.alloc(2 + body.length * 2);
    out[0] = 0xff;
    out[1] = 0xfe;
    out.write(body, 2, 'utf16le');
    if (format.encoding === 'utf16be') {
      for (let i = 0; i < out.length; i += 2) [out[i], out[i + 1]] = [out[i + 1], out[i]];
    }
    return out;
  }
  if (format.encoding === 'ansi') {
    const table = ansiTable();
    const bytes = [];
    for (const char of body) {
      if (!table.has(char))
        return writeText(text, { encoding: 'utf8', bom: true, eol: format.eol });
      bytes.push(table.get(char));
    }
    return Buffer.from(bytes);
  }
  const utf8 = Buffer.from(body, 'utf8');
  return format.bom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), utf8]) : utf8;
}
