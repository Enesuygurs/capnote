// Uploaded files referenced by notes

export class AttachmentsFeature {
  // Older versions referenced uploads by absolute file URL (sometimes malformed, e.g. file://C:\...).
  // Rewrite those to the portable capnote-file://upload/<name> form.
  toPortableUploadUrls(html) {
    if (!html || !html.includes('file:')) return html;
    return html.replace(/(src|href)="(file:[^"]*)"/gi, (match, attr, url) => {
      let pathPart = url.replace(/^file:\/*/i, '').replace(/\\/g, '/');
      try {
        pathPart = decodeURIComponent(pathPart);
      } catch {
        // keep the raw value when it is not valid percent-encoding
      }
      const found = pathPart.match(/\/uploads\/([^/]+)$/);
      if (!found) return match;
      return `${attr}="capnote-file://upload/${encodeURIComponent(found[1])}"`;
    });
  }

  // Names of the upload files a note's HTML refers to
  extractUploadNames(html) {
    const names = new Set();
    for (const match of String(html || '').matchAll(/capnote-file:\/\/upload\/([^"\s<>]+)/g)) {
      try {
        names.add(decodeURIComponent(match[1]));
      } catch {
        // ignore malformed references
      }
    }
    return [...names];
  }

  // Delete upload files that no note uses. Locked notes keep their list of attachments in plain
  // text; if an older locked note has no list yet its files are unknown, so nothing is deleted.
  async cleanupUploads() {
    if (this.notes.some((note) => note.isLocked && !Array.isArray(note.attachments))) return;
    const keep = new Set();
    this.notes.forEach((note) => (note.attachments || []).forEach((name) => keep.add(name)));
    try {
      await window.electronAPI.uploads.cleanup([...keep]);
    } catch (err) {
      console.warn('Upload cleanup failed:', err);
    }
  }
}
