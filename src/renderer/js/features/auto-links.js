// Web addresses become links by themselves (part of "Automatic formatting" in the settings):
// pasted text with addresses in it, and an address typed and followed by a space or Enter. Not in
// a code block and not inside a link that is already there.

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;

// Punctuation that ends a sentence is not part of the address (a closing bracket only when the
// address has no opening one)
function trimAddress(raw) {
  let address = raw.replace(/[.,;:!?'"]+$/, '');
  while (/[)\]}]$/.test(address)) {
    const close = address.slice(-1);
    const open = { ')': '(', ']': '[', '}': '{' }[close];
    if (address.split(open).length >= address.split(close).length) break;
    address = address.slice(0, -1);
  }
  return address;
}

export class AutoLinksFeature {
  autoLinksOn() {
    return this.settings?.autoFormat !== false;
  }

  // Where a link may not be made: in code, in a link
  inNoLinkZone(node) {
    const el = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return !!el?.closest('a, pre, code');
  }

  linkElement(address) {
    const a = document.createElement('a');
    a.href = this.normalizeLinkUrl(address) || address;
    a.textContent = address;
    return a;
  }

  // The addresses in a text node (those overlapping [from, to) of the note's text) become links
  linkifyTextNode(node, nodeStart, from, to) {
    const found = [];
    URL_PATTERN.lastIndex = 0;
    for (const match of node.data.matchAll(URL_PATTERN)) {
      const address = trimAddress(match[0]);
      const start = nodeStart + match.index;
      if (!address || !this.normalizeLinkUrl(address)) continue;
      if (start + address.length <= from || start >= to) continue;
      found.push({ index: match.index, address });
    }
    // From the last one, so the earlier positions stay right
    found.reverse().forEach(({ index, address }) => {
      const word = document.createRange();
      word.setStart(node, index);
      word.setEnd(node, index + address.length);
      const link = this.linkElement(address);
      word.deleteContents();
      word.insertNode(link);
    });
    return found.length;
  }

  // Paste: the text goes in as plain text would (lines, undo), then the addresses in what was
  // pasted become links
  pasteWithLinks(text) {
    if (!this.autoLinksOn() || !text) return false;
    URL_PATTERN.lastIndex = 0;
    if (!URL_PATTERN.test(text)) return false;
    const range = this.caretRange();
    if (!range || this.inNoLinkZone(range.startContainer)) return false;
    const ed = this.richEditor;
    const from = this.textOffsetIn(ed, range);
    document.execCommand('insertText', false, text);
    const now = this.caretRange();
    const to = now ? this.textOffsetIn(ed, now) : from + text.length;
    // The text nodes of the note, each with where it starts in the note's text
    const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const probe = document.createRange();
      probe.setStart(ed, 0);
      probe.setEnd(n, 0);
      const at = probe.toString().length;
      if (at + n.length > from && at < to && !this.inNoLinkZone(n)) nodes.push({ n, at });
    }
    let made = 0;
    nodes.forEach(({ n, at: start }) => (made += this.linkifyTextNode(n, start, from, to)));
    if (made) this.placeCaretAtTextOffset(ed, to);
    this.trackContentChanges();
    return true;
  }

  // The address that ends right before the caret (typed, then a space or Enter): a link
  linkWordBeforeCaret(spaceTyped) {
    if (!this.autoLinksOn()) return;
    const range = this.caretRange();
    if (!range || !range.collapsed) return;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE || this.inNoLinkZone(node)) return;
    const end = range.startOffset - (spaceTyped ? 1 : 0);
    const before = node.data.slice(0, end);
    const match = before.match(/(\S+)$/);
    if (!match) return;
    const address = trimAddress(match[1]);
    URL_PATTERN.lastIndex = 0;
    const full = address.match(URL_PATTERN);
    if (!full || full[0] !== address || !this.normalizeLinkUrl(address)) return;
    const start = before.length - match[1].length;
    const word = document.createRange();
    word.setStart(node, start);
    word.setEnd(node, start + address.length);
    const caretOffset = range.startOffset;
    const link = this.linkElement(address);
    word.deleteContents();
    word.insertNode(link);
    // The caret back where it was (after the space), outside the link
    const after = link.nextSibling;
    if (after && after.nodeType === Node.TEXT_NODE) {
      this.placeCaret(after, Math.max(0, caretOffset - start - address.length));
    } else {
      const r = document.createRange();
      r.setStartAfter(link);
      r.collapse(true);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(r);
    }
    this.trackContentChanges();
  }

  setupAutoLinks() {
    this.richEditor?.addEventListener('input', (e) => {
      if (e.inputType === 'insertText' && e.data === ' ') this.linkWordBeforeCaret(true);
    });
    // Enter: the address before the caret becomes a link before the line breaks
    this.richEditor?.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
          this.linkWordBeforeCaret(false);
        }
      },
      true
    );
  }
}
