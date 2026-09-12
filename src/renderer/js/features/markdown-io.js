// Markdown export and import. Export writes every note as a .md file (folders become folders) with
// its details in a front matter block, images in "attachments" and links between notes as
// [[Title]]. Import turns .md files into notes that edit like any other: headings, lists, task
// lists, tables, code, quotes, links and [[Title]] links to existing notes, with their images.

import { i18n } from '../i18n.js';
import { toMoodKey, toWeatherKey } from '../data/moods.js';

export class MarkdownIoFeature {
  // ============ HTML -> Markdown ============
  escapeMarkdown(text) {
    return text.replace(/([\\`*_[\]])/g, '\\$1');
  }

  inlineMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return this.escapeMarkdown(node.nodeValue.replace(/\u200B/g, '').replace(/\u00a0/g, ' '));
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const inner = () => [...node.childNodes].map((c) => this.inlineMarkdown(c)).join('');
    const wrap = (mark) => {
      const text = inner();
      return text.trim() ? `${mark}${text}${mark}` : text;
    };
    switch (node.tagName) {
      case 'B':
      case 'STRONG':
        return wrap('**');
      case 'I':
      case 'EM':
        return wrap('*');
      case 'S':
      case 'STRIKE':
      case 'DEL':
        return wrap('~~');
      case 'U':
        return `<u>${inner()}</u>`;
      case 'CODE':
        return `\`${node.textContent}\``;
      case 'BR':
        return '  \n';
      case 'IMG':
        return `![${node.getAttribute('alt') || ''}](${this.markdownImageSrc(node.getAttribute('src') || '')})`;
      case 'A': {
        if (node.classList.contains('note-link')) {
          const target = this.notes.find((n) => n.id === node.dataset.noteId);
          return `[[${target ? this.displayTitle(target) : node.textContent}]]`;
        }
        return `[${inner()}](${node.getAttribute('href') || ''})`;
      }
      case 'INPUT':
        return '';
      default:
        return inner();
    }
  }

  // Uploaded images are written next to the notes, in "attachments"
  markdownImageSrc(src) {
    const upload = src.match(/^capnote-file:\/\/upload\/(.+)$/);
    if (!upload) return src;
    let name;
    try {
      name = decodeURIComponent(upload[1]);
    } catch {
      name = upload[1];
    }
    this.markdownAttachments?.add(name);
    return `attachments/${encodeURIComponent(name)}`;
  }

  blockMarkdown(node, depth = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = this.inlineMarkdown(node).trim();
      return text ? [text] : [];
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return [];
    const tag = node.tagName;
    const inline = () =>
      [...node.childNodes]
        .map((c) => this.inlineMarkdown(c))
        .join('')
        .trim();
    const children = () => [...node.childNodes].flatMap((c) => this.blockMarkdown(c, depth));

    if (/^H[1-6]$/.test(tag)) return [`${'#'.repeat(Number(tag[1]))} ${inline()}`];
    if (tag === 'P') return [inline() || ''].filter((l) => l !== '');
    if (tag === 'HR') return ['---'];
    if (tag === 'PRE') {
      const lang = (node.querySelector('code')?.className.match(/language-(\S+)/) || [])[1] || '';
      // One block: the fences and the code are joined by single line breaks
      const code = node.textContent.replace(/\u200B/g, '').replace(/\n$/, '');
      return ['```' + lang + '\n' + code + '\n```'];
    }
    if (tag === 'BLOCKQUOTE') {
      const lines = node.querySelector('p, div, ul, ol') ? children() : [inline()];
      return [
        lines
          .join('\n\n')
          .split('\n')
          .map((l) => `> ${l}`.trimEnd())
          .join('\n'),
      ];
    }
    if (node.classList.contains('checklist')) {
      return [
        [...node.querySelectorAll('.checklist-item')]
          .map((item) => {
            const done = item.querySelector('input')?.hasAttribute('checked');
            const label = item.querySelector('label');
            const text = label
              ? [...label.childNodes]
                  .map((c) => this.inlineMarkdown(c))
                  .join('')
                  .trim()
              : '';
            return `- [${done ? 'x' : ' '}] ${text}`;
          })
          .join('\n'),
      ];
    }
    if (tag === 'UL' || tag === 'OL') {
      const indent = '   '.repeat(depth);
      const lines = [];
      [...node.children].forEach((li, index) => {
        const marker = tag === 'OL' ? `${index + 1}.` : '-';
        const own = [...li.childNodes]
          .filter((c) => !(c.nodeType === Node.ELEMENT_NODE && /^(UL|OL)$/.test(c.tagName)))
          .map((c) => this.inlineMarkdown(c))
          .join('')
          .trim();
        lines.push(`${indent}${marker} ${own}`);
        li.querySelectorAll(':scope > ul, :scope > ol').forEach((sub) =>
          lines.push(...this.blockMarkdown(sub, depth + 1))
        );
      });
      return depth ? lines : [lines.join('\n')];
    }
    if (tag === 'TABLE') {
      const rows = [...node.querySelectorAll('tr')].map((tr) =>
        [...tr.children].map((cell) =>
          [...cell.childNodes]
            .map((c) => this.inlineMarkdown(c))
            .join('')
            .trim()
            .replace(/\|/g, '\\|')
        )
      );
      if (!rows.length) return [];
      const width = Math.max(...rows.map((r) => r.length));
      const line = (cells) =>
        `| ${Array.from({ length: width }, (_, i) => cells[i] || '').join(' | ')} |`;
      return [
        [line(rows[0]), line(Array(width).fill('---')), ...rows.slice(1).map(line)].join('\n'),
      ];
    }
    if (tag === 'DIV' || tag === 'SECTION' || tag === 'SPAN') {
      // A plain wrapper: its own text is a paragraph, blocks inside stay blocks
      const hasBlocks = [...node.children].some((c) =>
        /^(P|DIV|H[1-6]|UL|OL|PRE|TABLE|BLOCKQUOTE|HR)$/.test(c.tagName)
      );
      return hasBlocks ? children() : [inline()].filter(Boolean);
    }
    return [this.inlineMarkdown(node).trim()].filter(Boolean);
  }

  htmlToMarkdown(html) {
    const body = this.parseInertHtml(this.sanitizeHtml(html || ''));
    return [...body.childNodes]
      .flatMap((node) => this.blockMarkdown(node))
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ============ Export ============
  yamlString(value) {
    return JSON.stringify(String(value));
  }

  noteToMarkdown(note) {
    const front = [
      '---',
      `title: ${this.yamlString(this.displayTitle(note))}`,
      `created: ${note.createdAt}`,
      `updated: ${note.updatedAt || note.createdAt}`,
    ];
    if ((note.tags || []).length)
      front.push(`tags: [${note.tags.map((t) => this.yamlString(t)).join(', ')}]`);
    if (note.mood) front.push(`mood: ${note.mood}`);
    if (note.weather) front.push(`weather: ${note.weather}`);
    if (note.isFavorite) front.push('favorite: true');
    if (note.isPinned) front.push('pinned: true');
    front.push('---', '');
    const body = note.isMarkdown ? note.content || '' : this.htmlToMarkdown(note.content);
    return `${front.join('\n')}\n# ${this.displayTitle(note)}\n\n${body}\n`;
  }

  // Every readable note as { path, content }; locked notes stay out
  markdownFiles() {
    this.markdownAttachments = new Set();
    const used = new Set();
    const safe = (name) =>
      String(name)
        .replace(/[\\/:*?"<>|]+/g, '_')
        .trim() || 'note';
    const files = [];
    let locked = 0;
    this.notes.forEach((note) => {
      if (note.isLocked) {
        locked += 1;
        return;
      }
      const folder = this.folders.find((f) => f.id === note.folderId);
      const dir = folder ? `${safe(folder.name)}/` : '';
      let name = `${dir}${safe(this.displayTitle(note))}`;
      let candidate = `${name}.md`;
      for (let i = 2; used.has(candidate.toLowerCase()); i++) candidate = `${name} (${i}).md`;
      used.add(candidate.toLowerCase());
      // Images in a folder point one level up, where "attachments" is
      const content = this.noteToMarkdown(note).replace(
        /\]\(attachments\//g,
        `](${folder ? '../' : ''}attachments/`
      );
      files.push({ path: candidate, content });
    });
    return { files, attachments: [...this.markdownAttachments], locked };
  }

  async exportMarkdown() {
    const { files, attachments, locked } = this.markdownFiles();
    let result;
    try {
      result = await window.electronAPI.exportMarkdown({ files, attachments });
    } catch (err) {
      console.error('Markdown export failed:', err);
      result = { ok: false };
    }
    if (result && result.ok) {
      this.showNotification(
        i18n.t('markdown.exported', { count: files.length, folder: result.folder }),
        'success'
      );
      if (locked)
        this.showNotification(i18n.t('markdown.lockedSkipped', { count: locked }), 'warning');
    } else if (!result || !result.canceled) {
      this.showNotification(i18n.t('messages.exportFailed'), 'error');
    }
  }

  // ============ Import ============
  // A front matter block at the top: simple "key: value" lines, tags as [a, b] or "- a" lines
  parseFrontMatter(text) {
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) return { data: {}, body: text };
    const data = {};
    let listKey = null;
    match[1].split(/\r?\n/).forEach((line) => {
      const item = line.match(/^\s*-\s+(.*)$/);
      if (item && listKey) {
        data[listKey].push(this.unquoteYaml(item[1]));
        return;
      }
      const pair = line.match(/^([\w-]+):\s*(.*)$/);
      if (!pair) return;
      const [, key, raw] = pair;
      listKey = null;
      if (raw === '') {
        data[key] = [];
        listKey = key;
      } else if (/^\[.*\]$/.test(raw)) {
        data[key] = raw
          .slice(1, -1)
          .split(',')
          .map((v) => this.unquoteYaml(v.trim()))
          .filter(Boolean);
      } else {
        data[key] = this.unquoteYaml(raw);
      }
    });
    return { data, body: text.slice(match[0].length) };
  }

  unquoteYaml(value) {
    const v = String(value).trim();
    if (/^".*"$/.test(v)) {
      try {
        return JSON.parse(v);
      } catch {
        return v.slice(1, -1);
      }
    }
    return v.replace(/^'(.*)'$/, '$1');
  }

  // Markdown to the editor's HTML: task list items become the app's tasks
  markdownToNoteHtml(markdown) {
    const html = this.sanitizeHtml(window.marked.parse(markdown, { gfm: true, breaks: false }));
    const body = this.parseInertHtml(html);
    body.querySelectorAll('ul').forEach((list) => {
      const items = [...list.children];
      if (
        !items.length ||
        !items.every((li) => li.querySelector(':scope > input[type="checkbox"]'))
      )
        return;
      const tasks = document.createElement('div');
      tasks.className = 'checklist';
      items.forEach((li) => {
        const box = li.querySelector(':scope > input[type="checkbox"]');
        const done = box.hasAttribute('checked');
        box.remove();
        const holder = document.createElement('div');
        holder.innerHTML = this.checklistItemHtml(li.innerHTML.trim() || '<br>');
        if (done) holder.querySelector('input').setAttribute('checked', 'checked');
        tasks.appendChild(holder.firstElementChild);
      });
      list.replaceWith(tasks);
    });
    return body.innerHTML;
  }

  // "[[Title]]" in imported notes links to the note with that title, if there is one
  linkWikiTitles(html) {
    return html.replace(/\[\[([^[\]\n<>]+)\]\]/g, (whole, title) => {
      const wanted = this.normalizeForSearch(title);
      const note = this.notes.find((n) => this.normalizeForSearch(this.displayTitle(n)) === wanted);
      if (!note) return whole;
      return `<a class="note-link" data-note-id="${note.id}" href="#">${this.escapeHtml(this.displayTitle(note))}</a>`;
    });
  }

  // files: [{ name, content, images: { ref: url } }] read by the main process
  async importMarkdownFiles(files) {
    const now = new Date().toISOString();
    const created = [];
    files.forEach((file) => {
      let text = String(file.content || '').replace(/^\uFEFF/, '');
      Object.entries(file.images || {}).forEach(([ref, url]) => {
        text = text.split(`](${ref})`).join(`](${url})`);
      });
      const { data, body } = this.parseFrontMatter(text);
      let markdown = body.trim();
      // The first heading is the title unless the front matter has one
      let title = data.title || '';
      const heading = markdown.match(/^#\s+(.+)\r?\n?/);
      if (
        heading &&
        (!title || this.normalizeForSearch(heading[1]) === this.normalizeForSearch(title))
      ) {
        title = title || heading[1].trim();
        markdown = markdown.slice(heading[0].length).trim();
      }
      if (!title) title = String(file.name || '').replace(/\.(md|markdown|txt)$/i, '');
      const date = (value) =>
        value && !isNaN(new Date(value)) ? new Date(value).toISOString() : null;
      const note = {
        id: this.newId(),
        title,
        content: this.markdownToNoteHtml(markdown),
        createdAt: date(data.created || data.date) || now,
        updatedAt: date(data.updated) || date(data.created || data.date) || now,
        tags: Array.isArray(data.tags)
          ? data.tags.map(String).slice(0, 5)
          : data.tags
            ? [String(data.tags)]
            : [],
        mood: toMoodKey(data.mood),
        weather: toWeatherKey(data.weather),
        isFavorite: data.favorite === 'true',
        isPinned: false,
        isLocked: false,
        folderId: null,
        formatting: this.getDefaultFormatting(),
        history: [{ type: 'created', ts: now }],
      };
      this.notes.unshift(note);
      created.push(note);
    });
    // Links are resolved once every imported note exists, so they can point at each other
    created.forEach((note) => {
      note.content = this.linkWikiTitles(note.content);
      note.attachments = this.extractUploadNames(note.content);
      const counts = this.countWordsAndCharsFromHtml(note.content);
      note.wordCount = counts.words;
      note.charCount = counts.chars;
    });
    await this.saveNotes();
    this.updateNotesList();
    this.updateFoldersList();
    this.updateStats();
    return created;
  }

  async importMarkdown() {
    let result;
    try {
      result = await window.electronAPI.importMarkdown();
    } catch (err) {
      console.error('Markdown import failed:', err);
      result = { ok: false };
    }
    if (!result || !result.ok) {
      if (!result || !result.canceled)
        this.showNotification(i18n.t('markdown.importFailed'), 'error');
      return;
    }
    const notes = await this.importMarkdownFiles(result.files);
    this.showNotification(i18n.t('markdown.imported', { count: notes.length }), 'success');
    if (notes.length) this.selectNote(notes[0]);
  }

  setupMarkdownIo() {
    this.exportMarkdownBtn?.addEventListener('click', () => this.exportMarkdown());
    this.importMarkdownBtn?.addEventListener('click', () => this.importMarkdown());
  }
}
