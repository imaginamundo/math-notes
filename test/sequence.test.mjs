import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstDifference, arraysEqual, applyLinePatch } from '../js/util/sequence.js';

test('firstDifference finds the first differing index', () => {
  assert.equal(firstDifference(['a', 'b', 'c'], ['a', 'b', 'c']), -1);
  assert.equal(firstDifference(['a', 'b', 'c'], ['a', 'x', 'c']), 1);
  assert.equal(firstDifference([], ['a']), 0);
  assert.equal(firstDifference(['a'], []), 0);
  assert.equal(firstDifference(['a', 'b'], ['a']), 1);
  // A longer array is a difference even when its extra slots are undefined.
  assert.equal(firstDifference(['a'], ['a', undefined]), 1);
  assert.equal(firstDifference(['a', undefined], ['a']), 1);
});

test('applyLinePatch rebuilds a line list from a suffix', () => {
  assert.deepEqual(applyLinePatch(['a', 'b', 'c'], 0, ['x', 'y', 'z']), ['x', 'y', 'z']);
  assert.deepEqual(applyLinePatch(['a', 'b', 'c'], 2, ['c2']), ['a', 'b', 'c2']);
  assert.deepEqual(applyLinePatch(['a', 'b', 'c'], 1, ['b2', 'c2']), ['a', 'b2', 'c2']);
  // No previous list means the suffix is the whole list.
  assert.deepEqual(applyLinePatch([], 3, ['a']), ['a']);
});

test('arraysEqual compares length and contents', () => {
  assert.ok(arraysEqual([], []));
  assert.ok(arraysEqual([1, 2], [1, 2]));
  assert.ok(!arraysEqual([1, 2], [1, 2, 3]));
  assert.ok(!arraysEqual([1, 2], [1, 3]));
});
