import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: ['js/lib/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker },
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
];
