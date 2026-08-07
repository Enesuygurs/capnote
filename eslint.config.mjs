import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Main and preload processes run as CommonJS in Node
    files: ['src/main.js', 'src/preload.js', 'src/main/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    // Classic renderer scripts loaded directly by index.html
    files: ['src/renderer/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        marked: 'readonly',
      },
    },
  },
  {
    // The application itself is made of ES modules
    files: ['src/renderer/js/**/*.js'],
    languageOptions: { sourceType: 'module' },
  },
  // Formatting is Prettier's job; turn off stylistic rules that would conflict with it
  prettier,
];
