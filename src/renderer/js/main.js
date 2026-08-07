// Renderer entry point
import { CapnoteApp } from './app.js';

// Module scripts run before DOMContentLoaded, so the listener always fires
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CapnoteApp();
});
