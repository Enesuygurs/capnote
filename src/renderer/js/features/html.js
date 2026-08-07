// HTML helpers: escaping, sanitizing, parsing and text extraction

export class HtmlFeature {
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Note HTML is untrusted (it can come from an imported file), so it is always sanitized before rendering.
  // file: and blob: URLs stay allowed because dropped images are stored as local files.
  sanitizeHtml(html) {
    if (!window.DOMPurify) return this.escapeHtml(String(html || ''));
    return window.DOMPurify.sanitize(String(html || ''), {
      ADD_ATTR: ['contenteditable', 'target', 'checked'],
      FORBID_TAGS: ['style', 'form'],
      ALLOWED_URI_REGEXP:
        /^(?:(?:https?|mailto|tel|file|blob|capnote-file):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
  }

  // Parse HTML into a detached document that never loads resources or runs handlers
  parseInertHtml(html) {
    return new DOMParser().parseFromString(String(html || ''), 'text/html').body;
  }

  getPlainText(html) {
    return this.parseInertHtml(html).textContent || '';
  }

  // Count words/chars from an HTML string (used when saving notes)
  countWordsAndCharsFromHtml(html) {
    // Ensure adjacent tags and text-to-tag boundaries have separating spaces so innerText doesn't concatenate words
    let safeHtml = (html || '').replace(/></g, '> <');
    // Insert a space before a '<' if it's immediately preceded by a non-space and not already separated
    safeHtml = safeHtml.replace(/([^\s>])</g, '$1 <');
    const tmp = this.parseInertHtml(safeHtml);
    let text = tmp.textContent || '';
    text = text.replace(/\u00A0/g, ' ');
    const normalized = text.trim().replace(/\s+/g, ' ');
    let words = 0;
    try {
      const matches = normalized.match(/[\p{L}\p{N}]+/gu);
      words = matches ? matches.length : 0;
    } catch (e) {
      words = normalized ? normalized.split(' ').filter(Boolean).length : 0;
    }
    const chars = text.length;
    return { words, chars, text };
  }

  rgbToHex(rgb) {
    if (!rgb) return null;

    // Handle 'transparent'
    if (rgb === 'transparent') return null;

    // Match rgb() or rgba()
    const rgbaMatch = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/i);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1], 10);
      const g = parseInt(rgbaMatch[2], 10);
      const b = parseInt(rgbaMatch[3], 10);
      const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;

      // If fully transparent, return null so we can fallback to ancestor/bg
      if (a === 0) return null;

      return ('#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)).toLowerCase();
    }

    // If already a hex color, normalize
    const hexMatch = rgb.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      let hex = rgb.toLowerCase();
      // Expand short form #rgb to #rrggbb
      if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      return hex;
    }

    return null;
  }

  // Only accept hex colors in style attributes; anything else falls back to the default
  safeColor(color) {
    return /^#[0-9a-f]{3,8}$/i.test(String(color || '')) ? color : '#3b82f6';
  }
}
