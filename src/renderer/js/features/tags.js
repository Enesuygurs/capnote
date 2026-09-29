// Tags: a page with every tag and its notes, and filtering the sidebar list by a tag. A tag is
// matched without case ("Work" and "work" are one tag).

import { i18n } from '../i18n.js';

export class TagsFeature {
  tagKey(tag) {
    return String(tag || '')
      .trim()
      .toLocaleLowerCase(this.getLocale());
  }

  // Every tag with how many notes have it, most used first
  allTags() {
    const tags = new Map();
    this.notes.forEach((note) => {
      new Set((note.tags || []).map((t) => this.tagKey(t))).forEach((key) => {
        if (!key) return;
        const name = note.tags.find((t) => this.tagKey(t) === key);
        const entry = tags.get(key) || { key, name, count: 0 };
        entry.count += 1;
        tags.set(key, entry);
      });
    });
    return [...tags.values()].sort(
      (x, y) => y.count - x.count || x.name.localeCompare(y.name, this.getLocale())
    );
  }

  noteHasTag(note, key) {
    return (note.tags || []).some((t) => this.tagKey(t) === key);
  }

  // Filter the sidebar list by a tag (null: no tag filter)
  setTagFilter(tag) {
    this.currentTag = tag ? this.tagKey(tag) : null;
    const entry = this.currentTag && this.allTags().find((t) => t.key === this.currentTag);
    this.tagFilter.classList.toggle('hidden', !this.currentTag);
    this.tagFilter.querySelector('span').textContent = entry ? entry.name : tag || '';
    this.updateNotesList();
    this.updateFoldersList();
    if (this.tagsScreen && !this.tagsScreen.classList.contains('hidden')) this.renderTagsScreen();
  }

  showTagsScreen(tag) {
    this.showScreen('tags');
    if (tag !== undefined) this.setTagFilter(tag);
    this.renderTagsScreen();
  }

  renderTagsScreen() {
    const tags = this.allTags();
    const cloud = this.tagsCloud;
    cloud.innerHTML = '';
    if (!tags.length) {
      cloud.innerHTML = `<div class="empty-state empty-state-large"><i class="fas fa-tags"></i><p>${i18n.t('tags.empty')}</p></div>`;
      this.tagNotesSection.classList.add('hidden');
      return;
    }
    tags.forEach((tag) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'tag-chip';
      chip.classList.toggle('active', tag.key === this.currentTag);
      chip.innerHTML =
        '<i class="fas fa-hashtag"></i><span class="tag-chip-name"></span><span class="tag-chip-count"></span>';
      chip.querySelector('.tag-chip-name').textContent = tag.name;
      chip.querySelector('.tag-chip-count').textContent = tag.count;
      // A second click on the chosen tag clears the filter
      chip.addEventListener('click', () =>
        this.setTagFilter(tag.key === this.currentTag ? null : tag.name)
      );
      cloud.appendChild(chip);
    });

    // The notes of the chosen tag
    const chosen = tags.find((t) => t.key === this.currentTag);
    this.tagNotesSection.classList.toggle('hidden', !chosen);
    if (!chosen) return;
    this.tagNotesLabel.textContent = `#${chosen.name} · ${i18n.t('tags.notesCount', { count: chosen.count })}`;
    const list = this.tagNotesList;
    list.innerHTML = '';
    this.notes
      .filter((note) => this.noteHasTag(note, chosen.key))
      .sort((x, y) => new Date(y.updatedAt || y.createdAt) - new Date(x.updatedAt || x.createdAt))
      .forEach((note) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'list-card tag-note';
        const folder = this.folders.find((f) => f.id === note.folderId);
        row.innerHTML = `<div class="list-card-main"><div class="list-card-title"></div><div class="list-card-meta"></div></div><i class="fas fa-chevron-right tag-note-open"></i>`;
        row.querySelector('.list-card-title').textContent = this.displayTitle(note);
        row.querySelector('.list-card-meta').textContent = [
          new Date(note.updatedAt || note.createdAt).toLocaleDateString(this.getLocale(), {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          folder ? folder.name : null,
        ]
          .filter(Boolean)
          .join(' · ');
        row.addEventListener('click', () => this.selectNote(note));
        list.appendChild(row);
      });
  }

  setupTags() {
    this.tagsNavBtn?.addEventListener('click', () =>
      this.toggleScreenFromButton('tags', () => this.showTagsScreen())
    );
    this.clearTagFilterBtn?.addEventListener('click', () => this.setTagFilter(null));
    // A tag on a note opens the tags page with that tag chosen
    this.viewerTags?.addEventListener('click', (e) => {
      const chip = e.target.closest('.viewer-tag');
      if (chip) this.showTagsScreen(chip.textContent);
    });
  }
}
