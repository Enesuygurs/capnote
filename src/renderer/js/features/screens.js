// Switching between the main screens

export class ScreensFeature {
  // Show exactly one of the main screens and highlight its sidebar entry (if it has one)
  showScreen(name) {
    this.hideEmojiPanel();

    const screens = {
      welcome: this.welcomeScreen,
      editor: this.noteEditor,
      viewer: this.noteViewer,
      reminders: this.remindersScreen,
      notifications: this.notificationsScreen,
      todos: this.todosScreen,
    };
    Object.entries(screens).forEach(([key, el]) => el?.classList.toggle('hidden', key !== name));

    const navItems = {
      reminders: this.remindersNav,
      notifications: this.notificationsNav,
      todos: this.todosNav,
    };
    Object.entries(navItems).forEach(([key, el]) => el?.classList.toggle('active', key === name));
  }

  showEditor() {
    this.showScreen('editor');

    // Reset form
    this.resetFormState();
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
    this.clearSavedSelection();
  }

  showRemindersScreen() {
    this.showScreen('reminders');
    this.updateRemindersView();
  }

  showNotificationsScreen() {
    this.showScreen('notifications');
    this.updateNotificationsView();
  }

  showTodosScreen() {
    this.hideAllModals();
    this.showScreen('todos');
    this.renderTodosSections();
  }
}
