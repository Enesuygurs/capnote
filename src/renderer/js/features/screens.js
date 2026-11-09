// Switching between the main screens

import { i18n } from '../i18n.js';

export class ScreensFeature {
  // Show exactly one of the main screens and highlight its sidebar entry (if it has one)
  showScreen(name) {
    this.hideEmojiPanel();
    this.hideNoteLinkMenu?.();
    this.hideReminderPickers?.();
    // An open list (text style, font) or toolbar menu does not wait for the editor to come back
    this.closeAllDropdowns?.();
    this.closeToolbarMenus?.();

    const screens = {
      welcome: this.welcomeScreen,
      editor: this.noteEditor,
      viewer: this.noteViewer,
      reminders: this.remindersScreen,
      tags: this.tagsScreen,
      archive: this.archiveScreen,
      summary: this.summaryScreen,
      graph: this.graphScreen,
      todos: this.todosScreen,
      folderLock: this.folderLockScreen,
    };
    Object.entries(screens).forEach(([key, el]) => el?.classList.toggle('hidden', key !== name));
    if (name !== 'editor' && this.isFocusMode()) this.setFocusMode(false);
    if (name !== 'viewer') this.clearVersionPreview?.();
    this.currentScreen = name;

    const navItems = {
      reminders: this.remindersNav,
      tags: this.tagsNavBtn,
      archive: this.archiveNavBtn,
      graph: this.graphNavBtn,
      todos: this.todosNav,
    };
    Object.entries(navItems).forEach(([key, el]) => el?.classList.toggle('active', key === name));
  }

  // A page opened from its header button (tags, archive): a second click on the button goes back
  // to the screen it was opened from
  toggleScreenFromButton(name, open) {
    if (this.currentScreen !== name) {
      this.screenBeforeToggle = this.currentScreen;
      open();
      return;
    }
    const back = this.screenBeforeToggle;
    // The other pages are drawn again, so they show what changed meanwhile
    const reopen = {
      reminders: () => this.showRemindersScreen(),
      todos: () => this.showTodosScreen(),
      tags: () => this.showTagsScreen(),
      archive: () => this.showArchiveScreen(),
      graph: () => this.showNoteGraph(),
    };
    const note =
      this.currentNote && this.notes.includes(this.currentNote) ? this.currentNote : null;
    if (back === 'editor' && this.currentNote) {
      this.showScreen('editor');
    } else if (back === 'viewer' && note) {
      this.showViewer();
      this.displayNote(note);
    } else if (back !== name && reopen[back]) {
      reopen[back]();
    } else {
      this.showWelcome();
    }
  }

  // Focus mode: only the note's title and text, in a column in the middle; the sidebar, the
  // toolbar and the side panel are hidden. Escape or the button leaves it, and so does leaving
  // the editor.
  isFocusMode() {
    return document.body.classList.contains('focus-mode');
  }

  setFocusMode(on) {
    document.body.classList.toggle('focus-mode', on);
    if (!this.focusModeBtn) return;
    this.focusModeBtn.classList.toggle('active', on);
    this.focusModeBtn.querySelector('i').className = `fas ${on ? 'fa-compress' : 'fa-expand'}`;
    const label = i18n.t(on ? 'titles.focusModeExit' : 'titles.focusMode');
    this.focusModeBtn.title = label;
    this.focusModeBtn.setAttribute('aria-label', label);
  }

  showEditor() {
    this.showScreen('editor');

    // Reset form
    this.resetFormState();
    // Each note starts with an empty reminder form
    this.resetReminderForm?.();
    // Ensure the preview is hidden when entering editor
    this.hideMarkdownPreview();
  }

  showViewer() {
    this.showScreen('viewer');
    this.clearSavedSelection();
  }

  showWelcome() {
    this.showScreen('welcome');
    this.renderDashboard();
    this.clearSavedSelection();
  }

  // One page: the reminders that came due (unread ones marked) and those still to come
  showRemindersScreen() {
    this.showScreen('reminders');
    // Fire anything that came due since the last check, so nothing past shows as upcoming
    this.checkDueReminders();
    this.updateNotificationsView();
    this.updateRemindersView();
  }

  // The came-due reminders are the top of the reminders page
  showNotificationsScreen() {
    this.showRemindersScreen();
    this.notificationsSection?.scrollIntoView({ block: 'start' });
  }

  showTodosScreen() {
    this.hideAllModals();
    this.showScreen('todos');
    this.renderTodosSections();
  }
}
