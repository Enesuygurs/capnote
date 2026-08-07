// Switching between the main screens

export class ScreensFeature {
  showEditor() {
    // Hide emoji panel when switching views
    try {
      this.hideEmojiPanel();
    } catch (e) {}
    this.welcomeScreen.classList.add('hidden');
    this.noteViewer.classList.add('hidden');
    this.noteEditor.classList.remove('hidden');
    this.remindersScreen?.classList.add('hidden');
    this.notificationsScreen?.classList.add('hidden');
    this.todosScreen?.classList.add('hidden');

    // Remove active from reminders and notifications
    this.remindersNav?.classList.remove('active');
    this.notificationsNav?.classList.remove('active');
    this.todosNav?.classList.remove('active');

    // Reset form
    this.resetFormState();
    // Ensure any previews are hidden when entering editor
    if (this.markdownPreview) this.hideMarkdownPreview();
    if (this.htmlPreview) {
      this.hideHtmlPreview();
      // clear iframe content if exists
      const iframe = this.htmlPreview.querySelector('iframe.preview-iframe');
      if (iframe) iframe.srcdoc = '';
      this.htmlPreview.innerHTML = '';
    }
  }

  showViewer() {
    // Hide emoji panel when switching views
    try {
      this.hideEmojiPanel();
    } catch (e) {}
    this.welcomeScreen.classList.add('hidden');
    this.noteEditor.classList.add('hidden');
    this.noteViewer.classList.remove('hidden');
    this.remindersScreen?.classList.add('hidden');
    this.notificationsScreen?.classList.add('hidden');
    this.todosScreen?.classList.add('hidden');

    // Remove active from reminders and notifications
    this.remindersNav?.classList.remove('active');
    this.notificationsNav?.classList.remove('active');
    this.todosNav?.classList.remove('active');

    this.clearSavedSelection();
  }

  showWelcome() {
    // Hide emoji panel when switching views
    try {
      this.hideEmojiPanel();
    } catch (e) {}
    this.noteEditor.classList.add('hidden');
    this.noteViewer.classList.add('hidden');
    this.welcomeScreen.classList.remove('hidden');
    this.remindersScreen?.classList.add('hidden');
    this.notificationsScreen?.classList.add('hidden');
    this.todosScreen?.classList.add('hidden');

    // Remove active from reminders and notifications
    this.remindersNav?.classList.remove('active');
    this.notificationsNav?.classList.remove('active');
    this.todosNav?.classList.remove('active');

    this.clearSavedSelection();
  }

  showRemindersScreen() {
    // Hide emoji panel when switching views
    try {
      this.hideEmojiPanel();
    } catch (e) {}
    this.noteEditor.classList.add('hidden');
    this.noteViewer.classList.add('hidden');
    this.welcomeScreen.classList.add('hidden');
    this.notificationsScreen?.classList.add('hidden');
    this.todosScreen?.classList.add('hidden');
    this.remindersScreen?.classList.remove('hidden');

    // Update active states for reminders/notifications group only
    this.remindersNav?.classList.add('active');
    this.notificationsNav?.classList.remove('active');
    this.todosNav?.classList.remove('active');

    this.updateRemindersView();
  }

  showNotificationsScreen() {
    // Hide emoji panel when switching views
    try {
      this.hideEmojiPanel();
    } catch (e) {}
    this.noteEditor.classList.add('hidden');
    this.noteViewer.classList.add('hidden');
    this.welcomeScreen.classList.add('hidden');
    this.remindersScreen?.classList.add('hidden');
    this.todosScreen?.classList.add('hidden');
    this.notificationsScreen?.classList.remove('hidden');

    // Update active states for reminders/notifications group only
    this.notificationsNav?.classList.add('active');
    this.remindersNav?.classList.remove('active');
    this.todosNav?.classList.remove('active');

    this.updateNotificationsView();
  }

  showTodosScreen() {
    this.hideAllModals();
    try {
      this.hideEmojiPanel();
    } catch (e) {}

    // Hide all screens
    this.noteEditor.classList.add('hidden');
    this.noteViewer.classList.add('hidden');
    this.welcomeScreen.classList.add('hidden');
    this.notificationsScreen?.classList.add('hidden');
    this.remindersScreen?.classList.add('hidden');
    this.todosScreen?.classList.remove('hidden');

    // Update active states - only for todos/reminders/notifications group
    this.todosNav?.classList.add('active');
    this.remindersNav?.classList.remove('active');
    this.notificationsNav?.classList.remove('active');

    this.renderTodosSections();
  }
}
