import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
