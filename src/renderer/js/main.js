// Renderer entry point
import { CapnoteApp } from './app.js';
import { renderTemplates } from './templates/index.js';

// Module scripts run before DOMContentLoaded, so the listener always fires
document.addEventListener('DOMContentLoaded', () => {
  renderTemplates();
  window.app = new CapnoteApp();
});
