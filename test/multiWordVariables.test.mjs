import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mangleName,
  unmangleName,
  namePattern,
  anchoredNamePattern,
  collectVariableNames,
  mangleLines,
} from '../js/core/multiWordVariables.js';

test('mangleName and unmangleName round-trip', () => {
  for (const name of ['monthly rent', 'net price', 'a b c', 'a_b c', 'monthly_rent']) {
    assert.equal(unmangleName(mangleName(name)), name);
  }
  assert.equal(mangleName('monthly rent'), '__var_monthly_rent');
  // Underscores are doubled so the mapping is reversible.
  assert.equal(mangleName('a_b c'), '__var_a__b_c');
});

test('unmangleName only recognises the variable namespace', () => {
  assert.equal(unmangleName('plain'), null);
  assert.equal(unmangleName('__tag_food'), null);
});

test('namePattern matches a whole name at identifier boundaries', () => {
  // namePattern returns a global regex, so use a fresh one per match.
  const matches = (text) => namePattern('monthly rent').exec(text) !== null;
  assert.ok(matches('monthly rent = 1'));
  assert.ok(matches('x = monthly   rent'));
  assert.ok(!matches('monthly rented'));
  assert.ok(!matches('xmonthly rent'));
});

test('anchoredNamePattern only matches at the start', () => {
  assert.ok(anchoredNamePattern('monthly rent').test('monthly rent = 1'));
  assert.ok(!anchoredNamePattern('monthly rent').test('x monthly rent'));
});

test('collectVariableNames gathers multi-word names, longest first', () => {
  assert.deepEqual(collectVariableNames(['monthly rent = 1500', 'x = 1', 'net price = 2']), [
    'monthly rent',
    'net price',
  ]);
  // A comment's `=` is not an assignment.
  assert.deepEqual(collectVariableNames(['a b = 1 # c d = 2', 'solo = 3']), ['a b']);
});

test('mangleLines rewrites code but leaves comments alone', () => {
  assert.deepEqual(mangleLines(['monthly rent = 1500', 'monthly rent * 12 # monthly rent']), [
    '__var_monthly_rent = 1500',
    '__var_monthly_rent * 12 # monthly rent',
  ]);
  // A single-word name is not mangled and does not match a longer one.
  assert.deepEqual(mangleLines(['net price = 1', 'price = 2', 'net price + price']), [
    '__var_net_price = 1',
    'price = 2',
    '__var_net_price + price',
  ]);
});
