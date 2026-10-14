// Keeps the service-worker cache honest. An installed PWA serves the precached
// shell cache-first with no revalidation, and a new worker installs only when
// serviceWorker.js itself changes bytes — so a content change reaches clients
// only if the cache version is bumped with it. This script hashes every precached
// entry into cache-manifest.json and, whenever anything changed, bumps the
// version in serviceWorker.js; the serviceWorker tests fail if the committed
// manifest no longer matches the files on disk.
//
//   npm run build:sw-manifest    recompute hashes, bump the version if needed
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const MANIFEST_FILE = 'cache-manifest.json';
const WORKER_FILE = 'serviceWorker.js';

// Every precached entry, as written in serviceWorker.js's urlsToCache list.
function cachedFiles(source = readFileSync(join(root, WORKER_FILE), 'utf8')) {
  const start = source.indexOf('urlsToCache');
  const block = source.slice(start, source.indexOf('];', start));
  return [
    ...new Set(
      [...block.matchAll(/'(\.\/[^']+)'/g)].map((match) => normalize(match[1]).replace(/^\.\//, ''))
    ),
  ].sort();
}

// { path: sha256 } for every precached file. './' and './index.html' collapse
// onto one entry, since they are the same document.
function hashCachedFiles(files = cachedFiles()) {
  const hashes = {};
  for (const rel of files) {
    hashes[rel] = createHash('sha256')
      .update(readFileSync(join(root, rel)))
      .digest('hex');
  }
  return hashes;
}

function readManifest() {
  try {
    return JSON.parse(readFileSync(join(root, MANIFEST_FILE), 'utf8'));
  } catch {
    return null;
  }
}

// The version is the number after the last '-' in the cache name: 'x-v45' → 45.
function readWorkerVersion(source = readFileSync(join(root, WORKER_FILE), 'utf8')) {
  const match = source.match(/cacheName = '([^']+)'/);
  if (!match) throw new Error(`${WORKER_FILE} has no cacheName assignment`);
  const version = Number(match[1].match(/(\d+)$/)?.[1]);
  if (!Number.isInteger(version)) throw new Error(`cache name has no version: ${match[1]}`);
  return { name: match[1].slice(0, match[1].length - String(version).length), version };
}

function changed(committed, files) {
  if (!committed) return true;
  const keys = Object.keys(files);
  if (keys.length !== Object.keys(committed.files).length) return true;
  return keys.some((key) => committed.files[key] !== files[key]);
}

// The version to ship: bumped only when a precached file changed, so running the
// script twice in a row is a no-op.
function nextVersion(committed, files, version) {
  return changed(committed, files) ? version + 1 : version;
}

// The worker's source with its cache name set to `name` + `version`.
function withCacheName(source, name, version) {
  return source.replace(/cacheName = '[^']+'/, `cacheName = '${name}${version}'`);
}

function rebuild() {
  const files = hashCachedFiles();
  const committed = readManifest();
  const { name, version } = readWorkerVersion();
  const next = nextVersion(committed, files, version);
  const manifest = { version: next, files };

  writeFileSync(join(root, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
  const source = readFileSync(join(root, WORKER_FILE), 'utf8');
  writeFileSync(join(root, WORKER_FILE), withCacheName(source, name, next));

  const verb = next === version ? 'unchanged' : `bumped to v${next}`;
  console.log(`${MANIFEST_FILE}: ${Object.keys(files).length} files, ${verb}`);
  return manifest;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) rebuild();

export {
  cachedFiles,
  changed,
  hashCachedFiles,
  nextVersion,
  readManifest,
  readWorkerVersion,
  withCacheName,
};
