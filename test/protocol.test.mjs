import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MSG, SETTING_NAMES, ENGINE_SETTING_NAMES } from '../js/protocol.js';

// The worker and the client each own a routing table for settings and speak a
// four-type message protocol. The lists live in js/protocol.js; these source
// pins keep the tables from drifting away from it.
const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(root, rel), 'utf8');

// Keys of a formatted object literal, at any indentation, terminated by `};`.
function objectKeys(text, declaration) {
  const start = text.indexOf(declaration);
  assert.notEqual(start, -1, `no \`${declaration}\` found`);
  const block = text.slice(start, text.indexOf('};', start));
  return [...block.matchAll(/^\s+'?([a-z-]+)'?:/gm)].map((match) => match[1]);
}

test('the worker routes every setting the protocol names', () => {
  assert.deepEqual(objectKeys(read('js/worker.js'), 'const SETTINGS = {'), SETTING_NAMES);
});

test('the fallback applies exactly the engine-owned settings', () => {
  const client = read('js/evalClient.js');
  assert.deepEqual(objectKeys(client, 'const FALLBACK_SETTINGS = {'), ENGINE_SETTING_NAMES);
});

test('a fresh worker is seeded with every setting', () => {
  const seeded = [...read('js/evalClient.js').matchAll(/seed\('([a-z-]+)'/g)].map((m) => m[1]);
  assert.deepEqual([...seeded].sort(), [...SETTING_NAMES].sort());
});

test('both ends import the protocol', () => {
  for (const rel of ['js/worker.js', 'js/evalClient.js']) {
    const code = read(rel);
    assert.ok(code.includes("from './protocol.js'"), `${rel} does not import js/protocol.js`);
    assert.ok(code.includes('MSG.'), `${rel} does not use MSG`);
  }
  assert.deepEqual(Object.keys(MSG), ['evaluate', 'setting', 'result', 'error']);
});
