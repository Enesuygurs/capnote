// i18n.js - Internationalization utility for Capnote

class I18n {
  constructor() {
    this.currentLanguage = 'tr'; // default language
    this.translations = {};
    this.observers = [];
  }

  async init() {
    // The app applies the saved language once its settings are loaded
    // Load translation files
    await this.loadTranslations();

    // Apply translations
    this.applyTranslations();
  }

  async loadTranslations() {
    // Load each language on its own so one broken file does not take the other down
    await Promise.all(
      ['tr', 'en'].map(async (lang) => {
        try {
          const response = await fetch(`locales/${lang}.json`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          this.translations[lang] = await response.json();
        } catch (error) {
          console.error(`Error loading ${lang} translations:`, error);
          this.translations[lang] = {};
        }
      })
    );
  }

  // Translate a dotted key; {name} placeholders are filled from params
  t(key, params) {
    const keys = key.split('.');
    let value = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    if (typeof value !== 'string') return key;
    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (match, name) =>
      name in params ? String(params[name]) : match
    );
  }

  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      this.applyTranslations();
      this.notifyObservers();
    } else {
      console.error('Language not available:', lang);
    }
  }

  getLanguage() {
    return this.currentLanguage;
  }

  applyTranslations() {
    // Update HTML lang attribute
    document.documentElement.lang = this.currentLanguage;

    // Update all elements with data-i18n attribute
    const i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach((element) => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      element.textContent = translation;
    });

    // Update all elements with data-i18n-placeholder attribute
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach((element) => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);

      // Handle both input/textarea and contenteditable elements
      if (element.hasAttribute('contenteditable')) {
        element.setAttribute('data-placeholder', translation);
      } else {
        element.placeholder = translation;
      }
    });

    // Update all elements with data-i18n-title attribute
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach((element) => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });

    // Update all elements with data-i18n-aria-label attribute
    const ariaElements = document.querySelectorAll('[data-i18n-aria-label]');
    ariaElements.forEach((element) => {
      const key = element.getAttribute('data-i18n-aria-label');
      element.setAttribute('aria-label', this.t(key));
    });
  }

  // Observer pattern for components that need to react to language changes
  subscribe(callback) {
    this.observers.push(callback);
  }

  notifyObservers() {
    this.observers.forEach((callback) => callback(this.currentLanguage));
  }
}

// Shared instance used by every module
export const i18n = new I18n();

// Initialize on DOM loaded. `ready` always resolves, even if loading the translations failed,
// so the app can start with keys as a fallback instead of waiting forever.
i18n.ready = new Promise((resolve) => {
  const start = () =>
    i18n
      .init()
      .catch((err) => console.error('i18n init failed:', err))
      .then(resolve);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
});
