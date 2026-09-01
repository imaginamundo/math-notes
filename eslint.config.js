import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: ['js/lib/**', 'node_modules/**', '**/*.tmp.*'],
  },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker },
    },
  },
  {
    files: ['test/**/*.{js,mjs}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ['eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Root-level dev scripts (e.g. ad-hoc verification files) may use either
    // Node or browser globals, so lint them with both instead of erroring.
    files: ['*.{js,mjs,cjs}', 'scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  prettier,
];
