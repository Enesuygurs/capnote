// Undo and redo for the rich editor. The browser's own undo cannot see changes made by hand to the
// page (code blocks, tables, tasks, lists, converted shortcuts), so the editor keeps one history of
// snapshots for everything: typing, formatting and the block tools. Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z)
// and the Edit menu go through it.

// Typing within this long of the last keystroke is one undo step
const TYPING_GROUP_MS = 800;
const HISTORY_LIMIT = 200;

export class EditorHistoryFeature {
  editorSnapshot() {
    this.syncCheckboxStates();
    const range = this.caretRange?.();
    return {
      html: this.richEditor.innerHTML,
      caret: range ? this.textOffsetIn(this.richEditor, range) : null,
    };
  }

  // A fresh history for the note that was just loaded into the editor
  resetEditorHistory() {
    this.editorHistory = { undo: [this.editorSnapshot()], redo: [], kind: null, at: 0 };
  }

  // Remember the editor as it is now. Repeated typing joins the step before it.
  recordEditorHistory(kind = 'step') {
    const history = this.editorHistory;
    if (!history || this.restoringHistory) return;
    const snapshot = this.editorSnapshot();
    const top = history.undo[history.undo.length - 1];
    if (top && top.html === snapshot.html) {
      top.caret = snapshot.caret;
      return;
    }
    const now = Date.now();
    const joins =
      kind === 'typing' && history.kind === 'typing' && now - history.at < TYPING_GROUP_MS;
    if (joins && history.undo.length > 1) history.undo[history.undo.length - 1] = snapshot;
    else history.undo.push(snapshot);
    if (history.undo.length > HISTORY_LIMIT) history.undo.shift();
    history.redo = [];
    history.kind = kind;
    history.at = now;
  }

  undoEditor() {
    const history = this.editorHistory;
    if (!history || history.undo.length < 2) return;
    history.redo.push(history.undo.pop());
    this.restoreEditorSnapshot(history.undo[history.undo.length - 1]);
  }

  redoEditor() {
    const history = this.editorHistory;
    if (!history || !history.redo.length) return;
    const snapshot = history.redo.pop();
    history.undo.push(snapshot);
    this.restoreEditorSnapshot(snapshot);
  }

  restoreEditorSnapshot(snapshot) {
    this.restoringHistory = true;
    try {
      this.richEditor.innerHTML = snapshot.html;
      this.upgradeImagesInEditor();
      this.restoreCheckboxStates();
      this.richEditor.focus();
      if (snapshot.caret !== null) this.placeCaretAtTextOffset(this.richEditor, snapshot.caret);
      this.trackContentChanges();
      this.updateWordCount();
    } finally {
      this.restoringHistory = false;
    }
    // The next change starts a new step
    this.editorHistory.kind = null;
  }

  setupEditorHistory() {
    // Runs before the editor's other input handlers, so typing is recorded as typing
    this.richEditor.addEventListener(
      'input',
      (e) => {
        const type = e.inputType || '';
        const typing = type.startsWith('insertText') || type.startsWith('delete');
        this.recordEditorHistory(typing ? 'typing' : 'step');
      },
      true
    );
    this.richEditor.addEventListener(
      'keydown',
      (e) => {
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.undoEditor();
        } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.redoEditor();
        }
      },
      true
    );
    // Undo and redo from the context menu or the Edit menu
    this.richEditor.addEventListener('beforeinput', (e) => {
      if (e.inputType === 'historyUndo') {
        e.preventDefault();
        this.undoEditor();
      } else if (e.inputType === 'historyRedo') {
        e.preventDefault();
        this.redoEditor();
      }
    });
  }
}
