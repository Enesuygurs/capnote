// The note map (a setting, off at first): a narrow column at the right of the open note's text with
// a small picture of the whole note, as a code editor's minimap. The part of the note on screen is
// a box on it; a click goes there, and dragging scrolls the note. It is the note's own text, drawn
// at a small scale (a copy of the viewer's or the editor's content; a plain text note's text), so
// headings, lists and images keep their shape. A note longer than the map scrolls the map with it.
// It follows the note on screen (another note, the editor, the viewer) and what is typed.

const MAP_WIDTH = 96;
// Space kept free at the right of the text for the map
const MAP_ROOM = MAP_WIDTH + 20;
// Space between the map and the scrollbar
const MAP_GAP = 12;
const REDRAW_DELAY_MS = 200;

function scrollParentOf(el) {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
}

export class NoteMinimapFeature {
  setupNoteMinimap() {
    const map = document.createElement('div');
    map.className = 'note-minimap hidden';
    map.setAttribute('aria-hidden', 'true');
    map.innerHTML = '<div class="note-minimap-inner"></div><div class="note-minimap-view"></div>';
    document.body.appendChild(map);
    this.minimap = {
      map,
      inner: map.querySelector('.note-minimap-inner'),
      view: map.querySelector('.note-minimap-view'),
      target: null,
      host: null,
      scale: 1,
      timer: null,
      frame: 0,
      drag: null,
    };
    this.minimapScroll = () => this.queueMinimapView();
    this.minimapResize = new ResizeObserver(() => this.refreshMinimap());

    map.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const m = this.minimap;
      const viewBox = m.view.getBoundingClientRect();
      // On the box: it moves with the mouse; elsewhere the note centers on the point first
      const grab =
        e.clientY >= viewBox.top && e.clientY <= viewBox.bottom
          ? e.clientY - viewBox.top
          : viewBox.height / 2;
      m.drag = { grab };
      this.scrollNoteToMap(e.clientY, grab);
      const move = (ev) => this.scrollNoteToMap(ev.clientY, grab);
      const up = () => {
        m.drag = null;
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
    // A wheel over the map scrolls the note
    map.addEventListener(
      'wheel',
      (e) => {
        if (!this.minimap.host) return;
        e.preventDefault();
        this.minimap.host.scrollTop += e.deltaY;
      },
      { passive: false }
    );
    this.richEditor?.addEventListener('input', () => this.scheduleMinimapRedraw());
    this.markdownEditor?.addEventListener('input', () => this.scheduleMinimapRedraw());
    window.addEventListener('resize', () => this.refreshMinimap());
  }

  // How much of the note's right side the map takes now (the find bar keeps clear of it)
  minimapWidth() {
    return this.minimap?.target ? MAP_WIDTH + MAP_GAP : 0;
  }

  isMinimapOn() {
    return !!this.settings?.noteMinimap;
  }

  // The text the map shows: the editor's (rich or plain) while editing, the note's while reading
  minimapTarget() {
    if (this.isEditorOpen?.()) {
      if (this.isMarkdownEditing?.() && !this.markdownEditor.classList.contains('hidden')) {
        return { kind: 'plain', el: this.markdownEditor };
      }
      if (this.richEditor && !this.richEditor.classList.contains('hidden')) {
        return { kind: 'rich', el: this.richEditor };
      }
      return null;
    }
    if (this.isViewerOpen?.() && this.currentNote && this.viewerText) {
      return { kind: 'rich', el: this.viewerText };
    }
    return null;
  }

  // The note on screen or the setting changed: the map is set up for it again (or hidden)
  refreshMinimap() {
    const m = this.minimap;
    if (!m) return;
    // Right after the screen changed (the next task, so its layout is in place)
    clearTimeout(m.frame);
    m.frame = setTimeout(() => {
      const target = this.isMinimapOn() ? this.minimapTarget() : null;
      const host = target ? scrollParentOf(target.el) || target.el : null;
      if (m.host !== host) {
        m.host?.removeEventListener('scroll', this.minimapScroll);
        this.minimapResize.disconnect();
        host?.addEventListener('scroll', this.minimapScroll, { passive: true });
        if (host) this.minimapResize.observe(host);
      }
      if (m.target && m.target.el !== target?.el) {
        m.target.el.classList.remove('minimap-room', 'minimap-room-inside');
      }
      m.target = target;
      m.host = host;
      m.map.classList.toggle('hidden', !target);
      if (!target) return;
      target.el.classList.add('minimap-room');
      // A text that scrolls itself keeps the room inside it, under the map
      target.el.classList.toggle('minimap-room-inside', host === target.el);
      target.el.style.setProperty('--minimap-room', `${MAP_ROOM}px`);
      this.placeMinimap();
      this.drawMinimap();
    }, 0);
  }

  scheduleMinimapRedraw() {
    const m = this.minimap;
    if (!m?.target) return;
    clearTimeout(m.timer);
    m.timer = setTimeout(() => this.drawMinimap(), REDRAW_DELAY_MS);
  }

  // The column at the right edge of the note's scrolling area, its full height
  placeMinimap() {
    const m = this.minimap;
    const box = m.host.getBoundingClientRect();
    const scrollbar = m.host.offsetWidth - m.host.clientWidth;
    m.map.style.top = `${Math.round(box.top)}px`;
    m.map.style.height = `${Math.round(box.height)}px`;
    m.map.style.left = `${Math.round(box.right - scrollbar - MAP_GAP - MAP_WIDTH)}px`;
    m.map.style.width = `${MAP_WIDTH}px`;
  }

  // A copy of the text at the scale that fits the map's width
  drawMinimap() {
    const m = this.minimap;
    if (!m.target) return;
    const el = m.target.el;
    const width = el.clientWidth || 1;
    m.scale = MAP_WIDTH / width;
    m.inner.style.width = `${width}px`;
    m.inner.style.transform = `scale(${m.scale})`;
    if (m.target.kind === 'plain') {
      const pre = document.createElement('pre');
      pre.className = 'note-minimap-plain';
      pre.textContent = el.value;
      m.inner.replaceChildren(pre);
    } else {
      // The same styles as the text (the viewer's formatted content, the editor's rich text)
      m.inner.className = `note-minimap-inner ${el.className}`.replace(
        /\b(hidden|minimap-room|find-pushed)\b/g,
        ''
      );
      m.inner.innerHTML = el.innerHTML;
      m.inner.querySelectorAll('input, button, select, textarea').forEach((c) => {
        c.tabIndex = -1;
        c.disabled = true;
      });
      m.inner.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      m.inner
        .querySelectorAll('[contenteditable]')
        .forEach((n) => n.removeAttribute('contenteditable'));
    }
    this.queueMinimapView();
  }

  queueMinimapView() {
    const m = this.minimap;
    if (!m?.target || m.viewFrame) return;
    m.viewFrame = requestAnimationFrame(() => {
      m.viewFrame = 0;
      this.updateMinimapView();
    });
  }

  // Where the text starts inside its scrolling area
  minimapTextTop() {
    const m = this.minimap;
    if (m.host === m.target.el) return 0;
    return (
      m.target.el.getBoundingClientRect().top -
      m.host.getBoundingClientRect().top +
      m.host.scrollTop
    );
  }

  // The box over the part on screen; a map taller than its column scrolls with the note
  updateMinimapView() {
    const m = this.minimap;
    if (!m.target || !m.host) return;
    const host = m.host;
    const mapHeight = m.map.clientHeight;
    const contentHeight = (m.inner.scrollHeight || m.inner.offsetHeight) * m.scale;
    const room = Math.max(0, contentHeight - mapHeight);
    const scrollable = Math.max(1, host.scrollHeight - host.clientHeight);
    const progress = Math.min(1, Math.max(0, host.scrollTop / scrollable));
    m.offset = room * progress;
    m.inner.style.translate = `0 ${-m.offset}px`;
    const top = (host.scrollTop - this.minimapTextTop()) * m.scale - m.offset;
    m.view.style.top = `${Math.round(top)}px`;
    m.view.style.height = `${Math.max(12, Math.round(host.clientHeight * m.scale))}px`;
  }

  // Scroll the note so the box's top is at this point of the map (less where it was grabbed)
  scrollNoteToMap(clientY, grab) {
    const m = this.minimap;
    if (!m.host) return;
    const mapTop = m.map.getBoundingClientRect().top;
    const y = clientY - mapTop - grab + (m.offset || 0);
    m.host.scrollTop = y / m.scale + this.minimapTextTop();
    this.updateMinimapView();
  }
}
