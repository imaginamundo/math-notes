import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMatches, nearestIndex } from '../js/ui/find.js';

test('computeMatches finds every non-overlapping occurrence', () => {
  assert.deepEqual(computeMatches('ab ab ab', 'ab', false), [
    { start: 0, end: 2 },
    { start: 3, end: 5 },
    { start: 6, end: 8 },
  ]);
});

test('computeMatches returns nothing for an empty query', () => {
  assert.deepEqual(computeMatches('abc', '', false), []);
});

test('computeMatches returns nothing when there are no matches', () => {
  assert.deepEqual(computeMatches('abc', 'xyz', false), []);
});

test('computeMatches is case-insensitive by default', () => {
  assert.deepEqual(computeMatches('Alpha alpha ALPHA', 'alpha', false), [
    { start: 0, end: 5 },
    { start: 6, end: 11 },
    { start: 12, end: 17 },
  ]);
});

test('computeMatches honors case sensitivity', () => {
  assert.deepEqual(computeMatches('Alpha alpha', 'alpha', true), [{ start: 6, end: 11 }]);
});

test('computeMatches does not overlap matches', () => {
  assert.deepEqual(computeMatches('aaaa', 'aa', false), [
    { start: 0, end: 2 },
    { start: 2, end: 4 },
  ]);
});

test('nearestIndex picks the first match at or after the anchor', () => {
  const matches = computeMatches('a a a', 'a', false);
  assert.equal(nearestIndex(matches, 0), 0);
  assert.equal(nearestIndex(matches, 1), 1);
  assert.equal(nearestIndex(matches, 2), 1);
  assert.equal(nearestIndex(matches, 4), 2);
});

test('nearestIndex falls back to the last match when past the end', () => {
  const matches = computeMatches('a a a', 'a', false);
  assert.equal(nearestIndex(matches, 99), 2);
});
