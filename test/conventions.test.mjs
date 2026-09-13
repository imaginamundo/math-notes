import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MESSAGES } from '../js/i18n/index.js';

// Enforce the project's storage convention: localStorage is only ever touched
// through js/util/storage.js so the "unavailable => null / no-op" policy is
// identical everywhere.
const root = fileURLToPath(new URL('..', import.meta.url));

function listJs(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'lib') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJs(path));
    else if (entry.name.endsWith('.js')) out.push(path);
  }
  return out;
}

test('localStorage is only accessed inside util/storage.js', () => {
  const access = /\blocalStorage\s*\./;
  const offenders = [];
  for (const path of listJs(join(root, 'js'))) {
    const rel = path.slice(root.length).replace(/^[\\/]/, '');
    if (rel === 'js/util/storage.js') continue;
    const source = readFileSync(path, 'utf8');
    if (access.test(source)) offenders.push(rel);
  }
  assert.deepEqual(offenders, []);
});

// The domain (core/eval) must not reach up into the UI: a pure module that
// imports `ui/` can no longer be imported without a document.
test('core and eval do not depend on the UI layer', () => {
  const offenders = [];
  for (const dir of ['core', 'eval']) {
    for (const path of listJs(join(root, 'js', dir))) {
      const rel = path.slice(root.length).replace(/^[\\/]/, '');
      const source = readFileSync(path, 'utf8');
      if (/from\s+['"][^'"]*\/ui\//.test(source)) offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, []);
});

// Every `data-i18n*` marker in the static markup must resolve in every locale,
// so a new label cannot ship untranslated.
test('every data-i18n key in index.html exists in every locale', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const keys = new Set();
  for (const match of html.matchAll(
    /data-i18n(?:-aria-label|-title|-placeholder|-html)?="([^"]+)"/g
  )) {
    keys.add(match[1]);
  }
  assert.ok(keys.size > 0, 'index.html should carry data-i18n markers');
  for (const [name, dict] of [
    ['en', MESSAGES.en],
    ['pt', MESSAGES.pt],
    ['es', MESSAGES.es],
  ]) {
    const missing = [...keys].filter((key) => !(key in dict));
    assert.deepEqual(missing, [], `${name} is missing: ${missing.join(', ')}`);
  }
});

// The evaluator stays English in v1, and importing the UI strings there would
// also drag the whole dictionary into the worker.
test('core and eval do not depend on the i18n layer', () => {
  const offenders = [];
  for (const dir of ['core', 'eval']) {
    for (const path of listJs(join(root, 'js', dir))) {
      const rel = path.slice(root.length).replace(/^[\\/]/, '');
      const source = readFileSync(path, 'utf8');
      if (/from\s+['"][^'"]*\/i18n\//.test(source)) offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, []);
});
