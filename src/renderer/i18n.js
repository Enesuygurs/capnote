// i18n.js - Internationalization utility for Capnote

class I18n {
  constructor() {
    this.currentLanguage = 'tr'; // default language
    this.translations = {};
    this.observers = [];
  }

  async init() {
    // Load saved language preference
    const savedLang = localStorage.getItem('app-language');
    if (savedLang) {
      this.currentLanguage = savedLang;
    }

    // Load translation files
    await this.loadTranslations();
    
    // Apply translations
    this.applyTranslations();
  }

  async loadTranslations() {
    try {
      console.log('Loading translations...');
      const trResponse = await fetch('locales/tr.json');
      const enResponse = await fetch('locales/en.json');
      
      if (!trResponse.ok || !enResponse.ok) {
        throw new Error('Failed to fetch translation files');
      }
      
      this.translations.tr = await trResponse.json();
      this.translations.en = await enResponse.json();
      
      console.log('Translations loaded successfully:', {
        tr: Object.keys(this.translations.tr).length,
        en: Object.keys(this.translations.en).length
      });
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback to empty objects
      this.translations.tr = {};
      this.translations.en = {};
    }
  }

  t(key) {
    const keys = key.split('.');
    let value = this.translations[this.currentLanguage];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return value || key;
  }

  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      localStorage.setItem('app-language', lang);
      this.applyTranslations();
      this.notifyObservers();
      console.log('Language changed to:', lang);
    } else {
      console.error('Language not available:', lang);
    }
  }

  getLanguage() {
    return this.currentLanguage;
  }

  applyTranslations() {
    console.log('Applying translations for language:', this.currentLanguage);
    
    // Update HTML lang attribute
    document.documentElement.lang = this.currentLanguage;

    // Update all elements with data-i18n attribute
    const i18nElements = document.querySelectorAll('[data-i18n]');
    console.log('Found', i18nElements.length, 'elements with data-i18n');
    i18nElements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      element.textContent = translation;
    });

    // Update all elements with data-i18n-placeholder attribute
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    console.log('Found', placeholderElements.length, 'elements with data-i18n-placeholder');
    placeholderElements.forEach(element => {
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
    console.log('Found', titleElements.length, 'elements with data-i18n-title');
    titleElements.forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.t(key);
    });

    // Update all elements with data-i18n-aria-label attribute
    const ariaElements = document.querySelectorAll('[data-i18n-aria-label]');
    console.log('Found', ariaElements.length, 'elements with data-i18n-aria-label');
    ariaElements.forEach(element => {
      const key = element.getAttribute('data-i18n-aria-label');
      element.setAttribute('aria-label', this.t(key));
    });
    
    console.log('Translation application complete');
  }

  // Observer pattern for components that need to react to language changes
  subscribe(callback) {
    this.observers.push(callback);
  }

  notifyObservers() {
    this.observers.forEach(callback => callback(this.currentLanguage));
  }
}

// Create global i18n instance
window.i18n = new I18n();

// Initialize on DOM loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    await window.i18n.init();
    console.log('i18n initialized, current language:', window.i18n.currentLanguage);
  });
} else {
  window.i18n.init().then(() => {
    console.log('i18n initialized, current language:', window.i18n.currentLanguage);
  });
}
