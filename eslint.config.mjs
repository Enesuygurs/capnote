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
    // The main process and the build scripts are ES modules running in Node
    files: ['src/main/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    // Sandboxed preload scripts must be CommonJS
    files: ['src/preload.cjs'],
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
