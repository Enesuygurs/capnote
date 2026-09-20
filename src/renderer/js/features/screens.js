// Switching between the main screens

export class ScreensFeature {
  // Show exactly one of the main screens and highlight its sidebar entry (if it has one)
  showScreen(name) {
    this.hideEmojiPanel();
    this.hideNoteLinkMenu?.();
    this.hideReminderPicker?.();

    const screens = {
      welcome: this.welcomeScreen,
      editor: this.noteEditor,
      viewer: this.noteViewer,
      notifications: this.notificationsScreen,
      reminders: this.remindersScreen,
      tags: this.tagsScreen,
      todos: this.todosScreen,
    };
    Object.entries(screens).forEach(([key, el]) => el?.classList.toggle('hidden', key !== name));

    const navItems = {
      notifications: this.notificationsNav,
      reminders: this.remindersNav,
      tags: this.tagsNavBtn,
      todos: this.todosNav,
    };
    Object.entries(navItems).forEach(([key, el]) => el?.classList.toggle('active', key === name));
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
