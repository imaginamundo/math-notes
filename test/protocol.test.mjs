import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MSG, SETTING, SETTING_NAMES, ENGINE_SETTING_NAMES } from '../js/protocol.js';

// The worker and the client each own a routing table for settings and speak a
// four-type message protocol. The lists live in js/protocol.js; these source
// pins keep the tables from drifting away from it.
const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(root, rel), 'utf8');

// The setting names a formatted object literal is keyed by (`[SETTING.x]:`),
// resolved through the protocol. A key written as a bare string would not be
// found here, so it fails the comparison below.
function objectKeys(text, declaration) {
  const start = text.indexOf(declaration);
  assert.notEqual(start, -1, `no \`${declaration}\` found`);
  const block = text.slice(start, text.indexOf('};', start));
  return [...block.matchAll(/^\s+\[SETTING\.(\w+)\]:/gm)].map((match) => {
    assert.ok(match[1] in SETTING, `SETTING.${match[1]} is not defined`);
    return SETTING[match[1]];
  });
}

test('the worker routes every setting the protocol names', () => {
  assert.deepEqual(objectKeys(read('js/worker.js'), 'const SETTINGS = {'), SETTING_NAMES);
});

test('the fallback applies exactly the engine-owned settings', () => {
  const client = read('js/evalClient.js');
  assert.deepEqual(objectKeys(client, 'const FALLBACK_SETTINGS = {'), ENGINE_SETTING_NAMES);
});

test('a fresh worker is seeded with every setting', () => {
  const seeded = [...read('js/evalClient.js').matchAll(/seed\(SETTING\.(\w+),/g)].map((m) => {
    assert.ok(m[1] in SETTING, `SETTING.${m[1]} is not defined`);
    return SETTING[m[1]];
  });
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

test('no setting name is spelled as a string literal outside the protocol', () => {
  for (const rel of ['js/worker.js', 'js/evalClient.js']) {
    const code = read(rel);
    for (const name of SETTING_NAMES) {
      assert.ok(
        !new RegExp(`(seed|postSetting)\\('${name}'|^\\s+'${name}':`, 'm').test(code),
        `${rel} spells the "${name}" setting as a string`
      );
    }
  }
});

test('every setting the protocol names is distinct', () => {
  assert.equal(new Set(SETTING_NAMES).size, SETTING_NAMES.length);
});
