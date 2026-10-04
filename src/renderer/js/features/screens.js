// Switching between the main screens

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
      notifications: this.notificationsScreen,
      reminders: this.remindersScreen,
      tags: this.tagsScreen,
      archive: this.archiveScreen,
      todos: this.todosScreen,
    };
    Object.entries(screens).forEach(([key, el]) => el?.classList.toggle('hidden', key !== name));
    this.currentScreen = name;

    const navItems = {
      notifications: this.notificationsNav,
      reminders: this.remindersNav,
      tags: this.tagsNavBtn,
      archive: this.archiveNavBtn,
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
      notifications: () => this.showNotificationsScreen(),
      todos: () => this.showTodosScreen(),
      tags: () => this.showTagsScreen(),
      archive: () => this.showArchiveScreen(),
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

  showEditor() {
    this.showScreen('editor');

    // Reset form
    this.resetFormState();
    // Each note starts with an empty reminder form
    this.resetReminderForm?.();
    // Ensure any previews are hidden when entering editor
    this.hideMarkdownPreview();
    if (this.htmlPreview) {
      this.hideHtmlPreview();
      // clear iframe content if exists
      const iframe = this.htmlPreview.querySelector('iframe.preview-iframe');
      if (iframe) iframe.srcdoc = '';
      this.htmlPreview.innerHTML = '';
    }
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

  showRemindersScreen() {
    this.showScreen('reminders');
    // Fire anything that came due since the last check, so nothing past shows as upcoming
    this.checkDueReminders();
    this.updateRemindersView();
  }

  showNotificationsScreen() {
    this.showScreen('notifications');
    this.checkDueReminders();
    this.updateNotificationsView();
  }

  showTodosScreen() {
    this.hideAllModals();
    this.showScreen('todos');
    this.renderTodosSections();
  }
}
