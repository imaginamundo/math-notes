import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Import every module in the app so a broken import or a top-level crash in one
// file surfaces here instead of only in a browser. Browser-only entry points
// (which touch window/navigator at import time) and the big mathjs bundle are
// excluded.
const root = fileURLToPath(new URL('..', import.meta.url));
const EXCLUDED = new Set([
  'js/index.js',
  'js/registerServiceWorker.js',
  'js/worker.js',
  'js/serviceWorker.js',
]);

function listModules(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'lib') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listModules(path));
    else if (entry.name.endsWith('.js')) out.push(path);
  }
  return out;
}

const modules = listModules(join(root, 'js'))
  .map((path) => relative(root, path))
  .filter((path) => !EXCLUDED.has(path))
  .sort();

test('every module imports cleanly', async () => {
  assert.ok(modules.length > 0);
  for (const path of modules) {
    await assert.doesNotReject(import(`../${path}`), `failed to import ${path}`);
  }
});
