import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cachedFiles as precachedUrls,
  changed,
  hashCachedFiles,
  nextVersion,
  readManifest,
  readWorkerVersion,
  withCacheName,
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

// The pieces of the manifest script, on in-memory data so the bump rules are
// pinned without touching the real worker or manifest.
const manifestOf = (files) => ({ version: 1, files });

test('a manifest is unchanged only when every precached hash matches', () => {
  const files = { 'a.js': 'x', 'b.js': 'y' };
  assert.equal(changed(manifestOf({ ...files }), files), false);
  assert.equal(changed(null, files), true, 'no manifest means everything is new');
  assert.equal(changed(manifestOf(files), { ...files, 'b.js': 'z' }), true, 'content changed');
  assert.equal(changed(manifestOf(files), { ...files, 'c.js': 'w' }), true, 'file added');
  assert.equal(changed(manifestOf(files), { 'a.js': 'x' }), true, 'file removed');
  assert.equal(
    changed(manifestOf({ 'a.js': 'x', 'b.js': 'y' }), { 'a.js': 'x', 'c.js': 'y' }),
    true,
    'a file swapped for another with the same count and hash'
  );
});

test('the version is bumped once per change and never otherwise', () => {
  const files = { 'a.js': 'x' };
  assert.equal(nextVersion(manifestOf(files), files, 7), 7);
  assert.equal(nextVersion(manifestOf(files), { 'a.js': 'y' }, 7), 8);
  assert.equal(nextVersion(null, files, 7), 8);
});

test('the cache name keeps its prefix and takes the new version', () => {
  const source = "const cacheName = 'math-notes-v59';\nconst other = 'v1';";
  assert.deepEqual(readWorkerVersion(source), { name: 'math-notes-v', version: 59 });
  const next = withCacheName(source, 'math-notes-v', 60);
  assert.equal(next, "const cacheName = 'math-notes-v60';\nconst other = 'v1';");
  assert.equal(readWorkerVersion(next).version, 60);
});

test('the worker version is read from a multi-digit suffix only', () => {
  assert.equal(readWorkerVersion("const cacheName = 'app2-v100';").version, 100);
  assert.throws(() => readWorkerVersion("const cacheName = 'no-version';"), /no version/);
  assert.throws(() => readWorkerVersion('const x = 1;'), /no cacheName/);
});

test('the precache list is read from the worker source, deduplicated and sorted', () => {
  const source = "const urlsToCache = [\n  './',\n  './b.js',\n  './a.js',\n  './b.js',\n];";
  // './' is the same document as index.html, so it is not an entry of its own.
  assert.deepEqual(precachedUrls(source), ['a.js', 'b.js']);
});
