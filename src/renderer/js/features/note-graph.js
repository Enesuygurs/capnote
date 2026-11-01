// The note graph: notes as dots and their [[links]] as lines, laid out by a small force simulation
// (linked notes pull together, every note pushes the others away). A note with more links is a
// bigger dot. Hovering a note brings out its neighbours, a click opens it; the map can be dragged
// and zoomed with the wheel, and a note can be dragged to another place.

import { i18n } from '../i18n.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// The graph's icon (also in index.html): a hub with four notes around it, two of them linked
const GRAPH_ICON = document.getElementById('graphNavBtn')?.innerHTML.trim() || '';
// Labels for every note up to this many dots; past it only for the notes with the most links
const ALL_LABELS_UP_TO = 40;
const MIN_SCALE = 0.3;
const MAX_SCALE = 4;
// Layout: the length a link settles at (px), how far (in links) notes push each other away, and
// the pull to the middle
const LINK_LENGTH = 80;
const REPEL_REACH = 3;
const GRAVITY = 0.08;

const svg = (tag, attrs = {}) => {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
};

export class NoteGraphFeature {
  // The notes in the graph and their links (each pair once, either direction)
  noteGraph({ unlinked = false } = {}) {
    const notes = this.notes.filter((n) => !n.isArchived);
    const ids = new Set(notes.map((n) => n.id));
    const byTitle = new Map(notes.map((n) => [(n.title || '').trim().toLowerCase(), n.id]));
    const pairs = new Map();
    notes.forEach((note) => {
      if (this.isNoteLockedForView(note)) return;
      const content = note.content || '';
      const targets = [...content.matchAll(/data-note-id="([^"]+)"/g)].map((m) => m[1]);
      // Markdown notes link with [[Title]]
      if (note.isMarkdown) {
        [...content.matchAll(/\[\[([^\]\n]+)\]\]/g)].forEach((m) => {
          const id = byTitle.get(m[1].trim().toLowerCase());
          if (id) targets.push(id);
        });
      }
      targets.forEach((target) => {
        if (target === note.id || !ids.has(target)) return;
        const key = [note.id, target].sort().join('|');
        if (!pairs.has(key)) pairs.set(key, { source: note.id, target });
      });
    });
    const links = [...pairs.values()];
    const degree = new Map();
    links.forEach(({ source, target }) => {
      degree.set(source, (degree.get(source) || 0) + 1);
      degree.set(target, (degree.get(target) || 0) + 1);
    });
    const nodes = notes
      .filter((n) => unlinked || degree.has(n.id))
      .map((note) => ({ id: note.id, note, degree: degree.get(note.id) || 0 }));
    return { nodes, links };
  }

  // Positions inside width × height: a deterministic start on a spiral, then forces with cooling
  layoutNoteGraph(nodes, links, width, height) {
    const n = nodes.length;
    if (!n) return;
    const index = new Map(nodes.map((node, i) => [node.id, i]));
    // The length a link settles at; the layout is then fitted to the area
    const k = LINK_LENGTH;
    nodes.forEach((node, i) => {
      const r = k * 0.5 * Math.sqrt(i + 0.5);
      const angle = i * 2.399963;
      node.x = r * Math.cos(angle);
      node.y = r * Math.sin(angle);
    });
    const edges = links.map((l) => [index.get(l.source), index.get(l.target)]);
    const iterations = n > 300 ? 120 : 300;
    let temperature = k * 2;
    const dx = new Float64Array(n);
    const dy = new Float64Array(n);
    for (let step = 0; step < iterations; step++) {
      dx.fill(0);
      dy.fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          let x = nodes[i].x - nodes[j].x;
          let y = nodes[i].y - nodes[j].y;
          let d2 = x * x + y * y;
          if (d2 < 0.01) {
            x = 0.1 * (i - j);
            y = 0.1;
            d2 = x * x + y * y;
          }
          // Notes push each other away only nearby, so separate groups do not drift apart
          if (d2 > REPEL_REACH * REPEL_REACH * k * k) continue;
          const f = (k * k) / d2;
          dx[i] += x * f;
          dy[i] += y * f;
          dx[j] -= x * f;
          dy[j] -= y * f;
        }
      }
      edges.forEach(([a, b]) => {
        const x = nodes[a].x - nodes[b].x;
        const y = nodes[a].y - nodes[b].y;
        const d = Math.sqrt(x * x + y * y) || 0.1;
        const f = d / k;
        dx[a] -= x * f;
        dy[a] -= y * f;
        dx[b] += x * f;
        dy[b] += y * f;
      });
      for (let i = 0; i < n; i++) {
        // A pull to the middle keeps separate groups and lone notes near the rest
        dx[i] -= nodes[i].x * GRAVITY;
        dy[i] -= nodes[i].y * GRAVITY;
        const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 1;
        const move = Math.min(d, temperature);
        nodes[i].x += (dx[i] / d) * move;
        nodes[i].y += (dy[i] / d) * move;
      }
      temperature = Math.max(k * 0.01, temperature * 0.97);
    }
    // Fit into the area, keeping the proportions, with room for the labels
    const pad = 48;
    const xs = nodes.map((p) => p.x);
    const ys = nodes.map((p) => p.y);
    const [minX, maxX, minY, maxY] = [
      Math.min(...xs),
      Math.max(...xs),
      Math.min(...ys),
      Math.max(...ys),
    ];
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY, 1.5);
    const offX = (width - spanX * scale) / 2;
    const offY = (height - spanY * scale) / 2;
    nodes.forEach((p) => {
      p.x = n === 1 ? width / 2 : offX + (p.x - minX) * scale;
      p.y = n === 1 ? height / 2 : offY + (p.y - minY) * scale;
    });
  }

  showNoteGraph() {
    this.showScreen('graph');
    this.graphView = { x: 0, y: 0, scale: 1 };
    this.renderNoteGraph();
  }

  renderNoteGraph() {
    const box = this.graphCanvas;
    if (!box) return;
    const unlinked = this.graphShowUnlinked === true;
    this.graphRangeTabs?.querySelectorAll('.segment').forEach((tab) => {
      tab.classList.toggle('active', (tab.dataset.show === 'all') === unlinked);
    });
    const { nodes, links } = this.noteGraph({ unlinked });
    this.graphSubtitle.textContent = i18n.t('graph.count', {
      notes: nodes.length,
      links: links.length,
    });
    box.innerHTML = '';
    this.graphNodes = nodes;
    if (!links.length && !unlinked) {
      box.innerHTML = `<div class="graph-empty">${GRAPH_ICON}<p></p></div>`;
      box.querySelector('p').textContent = i18n.t('graph.empty');
      return;
    }
    const { width, height } = box.getBoundingClientRect();
    this.layoutNoteGraph(nodes, links, Math.max(width, 200), Math.max(height, 200));
    this.graphSize = `${Math.round(width)}x${Math.round(height)}`;

    const root = svg('svg', { class: 'graph-svg', width: '100%', height: '100%' });
    const view = svg('g', { class: 'graph-view' });
    const lines = svg('g', { class: 'graph-links' });
    const dots = svg('g', { class: 'graph-nodes' });
    view.append(lines, dots);
    root.appendChild(view);

    const byId = new Map(nodes.map((node) => [node.id, node]));
    const neighbours = new Map(nodes.map((node) => [node.id, new Set()]));
    links.forEach((link) => {
      neighbours.get(link.source).add(link.target);
      neighbours.get(link.target).add(link.source);
      link.el = svg('line', { class: 'graph-link' });
      lines.appendChild(link.el);
    });
    const ranked = [...nodes].sort((a, b) => b.degree - a.degree);
    const labelled = new Set(
      (nodes.length <= ALL_LABELS_UP_TO ? nodes : ranked.slice(0, ALL_LABELS_UP_TO / 2)).map(
        (node) => node.id
      )
    );
    nodes.forEach((node) => {
      const group = svg('g', {
        class: 'graph-node' + (node.degree ? '' : ' is-alone'),
        tabindex: '0',
        role: 'button',
      });
      group.dataset.noteId = node.id;
      const radius = Math.min(14, 5 + 2 * Math.sqrt(node.degree));
      const title = this.displayTitle(node.note);
      group.appendChild(svg('circle', { r: radius }));
      const label = svg('text', { y: radius + 14, 'text-anchor': 'middle' });
      label.textContent = title.length > 28 ? title.slice(0, 27) + '…' : title;
      if (!labelled.has(node.id)) group.classList.add('is-quiet');
      group.appendChild(label);
      const tip = svg('title');
      tip.textContent = `${title} · ${i18n.t('graph.links', { count: node.degree })}`;
      group.appendChild(tip);
      node.el = group;
      dots.appendChild(group);
    });

    const place = () => {
      nodes.forEach((node) => node.el.setAttribute('transform', `translate(${node.x},${node.y})`));
      links.forEach((link) => {
        const a = byId.get(link.source);
        const b = byId.get(link.target);
        link.el.setAttribute('x1', a.x);
        link.el.setAttribute('y1', a.y);
        link.el.setAttribute('x2', b.x);
        link.el.setAttribute('y2', b.y);
      });
    };
    const applyView = () => {
      const { x, y, scale } = this.graphView;
      view.setAttribute('transform', `translate(${x},${y}) scale(${scale})`);
    };
    place();
    applyView();

    // Hover or focus: the note, its neighbours and their links stand out
    const focus = (id) => {
      root.classList.toggle('is-focusing', !!id);
      const near = id ? neighbours.get(id) : new Set();
      nodes.forEach((node) =>
        node.el.classList.toggle('is-near', !!id && (node.id === id || near.has(node.id)))
      );
      links.forEach((link) =>
        link.el.classList.toggle('is-near', !!id && (link.source === id || link.target === id))
      );
    };
    dots.addEventListener('pointerover', (e) =>
      focus(e.target.closest('.graph-node')?.dataset.noteId)
    );
    dots.addEventListener('pointerout', () => focus(null));
    dots.addEventListener('focusin', (e) => focus(e.target.closest('.graph-node')?.dataset.noteId));
    dots.addEventListener('focusout', () => focus(null));
    dots.addEventListener('keydown', (e) => {
      const id = e.target.closest('.graph-node')?.dataset.noteId;
      if (id && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this.selectNote(byId.get(id).note);
      }
    });

    // Dragging: a note moves that note, the background moves the map; a press without moving
    // on a note opens it
    root.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const nodeEl = e.target.closest('.graph-node');
      const node = nodeEl && byId.get(nodeEl.dataset.noteId);
      const start = {
        x: e.clientX,
        y: e.clientY,
        viewX: this.graphView.x,
        viewY: this.graphView.y,
      };
      if (node) Object.assign(start, { nodeX: node.x, nodeY: node.y });
      let moved = false;
      // Keep getting the moves outside the map (a pointer the page did not see cannot be captured)
      try {
        root.setPointerCapture(e.pointerId);
      } catch {}
      root.classList.add('is-dragging');
      const onMove = (ev) => {
        const ddx = ev.clientX - start.x;
        const ddy = ev.clientY - start.y;
        if (!moved && Math.hypot(ddx, ddy) < 4) return;
        moved = true;
        if (node) {
          node.x = start.nodeX + ddx / this.graphView.scale;
          node.y = start.nodeY + ddy / this.graphView.scale;
          place();
        } else {
          this.graphView.x = start.viewX + ddx;
          this.graphView.y = start.viewY + ddy;
          applyView();
        }
      };
      const onUp = () => {
        root.removeEventListener('pointermove', onMove);
        root.removeEventListener('pointerup', onUp);
        root.removeEventListener('pointercancel', onUp);
        root.classList.remove('is-dragging');
        if (node && !moved) this.selectNote(node.note);
      };
      root.addEventListener('pointermove', onMove);
      root.addEventListener('pointerup', onUp);
      root.addEventListener('pointercancel', onUp);
    });

    // The wheel zooms around the pointer
    root.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const rect = root.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const v = this.graphView;
        const scale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, v.scale * Math.exp(-e.deltaY * 0.0015))
        );
        v.x = px - ((px - v.x) * scale) / v.scale;
        v.y = py - ((py - v.y) * scale) / v.scale;
        v.scale = scale;
        applyView();
      },
      { passive: false }
    );

    box.appendChild(root);
  }

  isGraphFullscreen() {
    return document.body.classList.contains('graph-full');
  }

  // Full screen: the sidebar is hidden and the map takes the window; Escape, the button or
  // another screen ends it
  setGraphFullscreen(on) {
    document.body.classList.toggle('graph-full', on);
    const btn = this.graphFullBtn;
    if (!btn) return;
    btn.classList.toggle('active', on);
    btn.querySelector('i').className = `fas ${on ? 'fa-compress' : 'fa-expand'}`;
    const label = i18n.t(on ? 'graph.fullscreenExit' : 'graph.fullscreen');
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }

  setupNoteGraph() {
    this.graphFullBtn?.addEventListener('click', () =>
      this.setGraphFullscreen(!this.isGraphFullscreen())
    );
    this.graphNavBtn?.addEventListener('click', () =>
      this.toggleScreenFromButton('graph', () => this.showNoteGraph())
    );
    this.graphRangeTabs?.addEventListener('click', (e) => {
      const tab = e.target.closest('.segment');
      if (!tab) return;
      this.graphShowUnlinked = tab.dataset.show === 'all';
      this.graphView = { x: 0, y: 0, scale: 1 };
      this.renderNoteGraph();
    });
    this.graphFitBtn?.addEventListener('click', () => {
      this.graphView = { x: 0, y: 0, scale: 1 };
      this.renderNoteGraph();
    });
    // A new size lays the map out again (the same layout, fitted to the new size)
    if (this.graphCanvas && typeof ResizeObserver === 'function') {
      new ResizeObserver(() => {
        const { width, height } = this.graphCanvas.getBoundingClientRect();
        const size = `${Math.round(width)}x${Math.round(height)}`;
        if (this.currentScreen === 'graph' && width && size !== this.graphSize) {
          this.renderNoteGraph();
        }
      }).observe(this.graphCanvas);
    }
  }
}
