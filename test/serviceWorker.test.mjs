import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

// The offline shell can only work if every module the app imports at runtime is
// precached. A new module that is left out would make the app open blank
// offline, so this walks the import graph and checks the cache list against it.
const root = fileURLToPath(new URL('..', import.meta.url));

function cachedFiles() {
  const source = readFileSync(join(root, 'serviceWorker.js'), 'utf8');
  const start = source.indexOf('urlsToCache');
  const block = source.slice(start, source.indexOf('];', start));
  return new Set(
    [...block.matchAll(/'(\.\/[^']+)'/g)].map((match) => normalize(match[1]).replace(/^\.\//, ''))
  );
}

function importsOf(rel) {
  const source = readFileSync(join(root, rel), 'utf8');
  const specs = new Set();
  const patterns = [
    /from\s*['"](\.[^'"]+)['"]/g,
    /import\s*\(\s*['"](\.[^'"]+)['"]/g,
    /import\s+['"](\.[^'"]+)['"]/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specs.add(match[1]);
  }
  return specs;
}

// Every relative module reachable from the app's entry points.
function runtimeModules() {
  const seen = new Set();
  const queue = ['js/index.js', 'js/worker.js'];
  while (queue.length) {
    const rel = normalize(queue.shift()).replace(/^\.\//, '');
    if (seen.has(rel) || !existsSync(join(root, rel))) continue;
    seen.add(rel);
    for (const spec of importsOf(rel)) {
      let resolved = normalize(join(dirname(rel), spec));
      if (!resolved.endsWith('.js')) resolved += '.js';
      queue.push(resolved);
    }
  }
  return seen;
}

test('every runtime module is in the service worker cache list', () => {
  const cached = cachedFiles();
  const missing = [...runtimeModules()].filter((rel) => !cached.has(rel)).sort();
  assert.deepEqual(
    missing,
    [],
    `modules missing from serviceWorker.js urlsToCache: ${missing.join(', ')}`
  );
});

test('the service worker cache list points at files that exist', () => {
  const missing = [...cachedFiles()].filter((rel) => !existsSync(join(root, rel))).sort();
  assert.deepEqual(missing, [], `urlsToCache entries that do not exist: ${missing.join(', ')}`);
});
