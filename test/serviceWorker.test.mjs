import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cachedFiles as precachedUrls,
  hashCachedFiles,
  readManifest,
  readWorkerVersion,
} from '../scripts/sw-manifest.mjs';

// The offline shell can only work if every module the app imports at runtime is
// precached. A new module that is left out would make the app open blank
// offline, so this walks the import graph and checks the cache list against it.
const root = fileURLToPath(new URL('..', import.meta.url));

function cachedFiles() {
  return new Set(precachedUrls());
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

// An installed PWA serves these files cache-first and never revalidates them,
// so a version only reaches clients when serviceWorker.js changes bytes. The
// manifest pins what is precached; the version pins when clients get it again.
test('the committed cache manifest matches the precached files', () => {
  const manifest = readManifest();
  assert.ok(manifest, 'cache-manifest.json is missing — run `npm run build:sw-manifest`');
  assert.deepEqual(
    hashCachedFiles(),
    manifest.files,
    'precached files changed without regenerating — run `npm run build:sw-manifest`'
  );
});

test('the service worker cache version matches the manifest', () => {
  const manifest = readManifest();
  assert.ok(manifest, 'cache-manifest.json is missing — run `npm run build:sw-manifest`');
  assert.equal(
    readWorkerVersion().version,
    manifest.version,
    'cacheName in serviceWorker.js was not bumped — run `npm run build:sw-manifest`'
  );
});
