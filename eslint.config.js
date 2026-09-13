import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      'js/lib/**',
      'node_modules/**',
      '**/*.tmp.*',
      'js/i18n/help/**',
      'js/i18n/examples/**',
      'docs/dist/**',
    ],
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
    // The i18n and docs build scripts run under Deno.
    files: ['js/i18n/build.js', 'docs/build.js'],
    languageOptions: {
      globals: { ...globals.node, Deno: 'readonly' },
    },
  },
  {
    // The docs enhancement script runs in the browser.
    files: ['docs/src/docs.js'],
    languageOptions: {
      globals: { ...globals.browser },
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
