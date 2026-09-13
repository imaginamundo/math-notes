import { test } from 'node:test';
import assert from 'node:assert/strict';
import { median, computeTotal, aggregateAbove } from '../js/core/aggregate.js';

test('median handles odd and even counts', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([5]), 5);
});

test('computeTotal sums values and skips errors, returning null when empty', () => {
  assert.equal(
    computeTotal([
      { type: 'value', value: 1 },
      { type: 'error', value: 'boom' },
      { type: 'value', value: 2 },
    ]),
    3
  );
  assert.equal(computeTotal([]), null);
});

test('aggregateAbove applies the mode to a slice', () => {
  const results = [
    { type: 'value', value: 1 },
    { type: 'value', value: 2 },
    { type: 'value', value: 3 },
  ];
  assert.equal(aggregateAbove(results, 0, 2, 'sum'), 3);
  assert.equal(aggregateAbove(results, 1, 3, 'average'), 2.5);
  assert.equal(aggregateAbove(results, 0, 2, 'median'), 1.5);
  assert.equal(aggregateAbove(results, 2, 2, 'sum'), 0);
});
