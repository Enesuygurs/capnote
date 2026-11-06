// Folding in the note viewer and the Markdown preview: a list item with a list under it, and a
// heading with what follows it (up to the next heading of the same or a higher level), get an arrow
// in the left margin that hides and shows them. Folding only changes the view, never the note; the
// folds of each note are kept while the app runs.

import { i18n } from '../i18n.js';

const HEADINGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

export class FoldingFeature {
  // Give the foldable parts of rendered content their arrows. key: whose folds these are (a note)
  makeFoldable(root, key = null) {
    if (!root) return;
    if (!this.foldStates) this.foldStates = new Map();
    const folded = (key && this.foldStates.get(key)) || new Set();
    const onToggle = (id, isFolded) => {
      if (!key) return;
      const set = this.foldStates.get(key) || new Set();
      if (isFolded) set.add(id);
      else set.delete(id);
      this.foldStates.set(key, set);
    };

    // List items with a list under them (at any depth)
    [...root.querySelectorAll('li')]
      .filter((li) => li.querySelector(':scope > ul, :scope > ol'))
      .forEach((li, i) => this.addFoldToggle(li, `li:${i}`, folded, onToggle));

    // Headings of the content (not ones inside lists, quotes or tables)
    const headings = [...root.children].filter((el) => HEADINGS.includes(el.tagName));
    headings.forEach((h, i) =>
      this.addFoldToggle(h, `h:${i}`, folded, (id, isFolded) => {
        onToggle(id, isFolded);
        this.applyHeadingFolds(root);
      })
    );
    this.applyHeadingFolds(root);
  }

  addFoldToggle(el, id, folded, onToggle) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fold-toggle';
    button.contentEditable = 'false';
    button.setAttribute('aria-label', i18n.t('titles.toggleFold'));
    button.innerHTML = '<i class="fas fa-chevron-down" aria-hidden="true"></i>';
    el.classList.add('foldable');
    el.classList.toggle('is-folded', folded.has(id));
    button.setAttribute('aria-expanded', String(!folded.has(id)));
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isFolded = el.classList.toggle('is-folded');
      button.setAttribute('aria-expanded', String(!isFolded));
      onToggle(id, isFolded);
    });
    // Its own clicks only: a double-click on it does not reach the content
    button.addEventListener('dblclick', (e) => e.stopPropagation());
    el.prepend(button);
  }

  // Hide what each folded heading covers: everything after it up to the next heading of the same
  // or a higher level (a heading inside a folded part stays folded or open as it was)
  applyHeadingFolds(root) {
    // The levels of the folded headings whose parts we are in
    const folding = [];
    [...root.children].forEach((el) => {
      const level = HEADINGS.indexOf(el.tagName) + 1;
      if (level) {
        while (folding.length && folding[folding.length - 1] >= level) folding.pop();
      }
      el.classList.toggle('fold-hidden', folding.length > 0);
      if (level && el.classList.contains('is-folded')) folding.push(level);
    });
  }
}
