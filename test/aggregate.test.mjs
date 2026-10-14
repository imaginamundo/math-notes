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

// REVIEW.md NUM-04: a Fraction (`to nearest 16th`) or BigNumber result was neither
// a plain number nor a Unit, so every aggregate skipped it without a word.
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';

const sheet = (lines) => {
  const { results, total } = createEngine().evaluateLines(lines);
  const shown = (value) => (value === null || value === undefined ? null : formatResult(value));
  return { rows: results.map((row) => shown(row.value)), total: shown(total) };
};

test('NUM-04: a Fraction result counts in sums, averages, medians and the total', () => {
  assert.equal(sheet(['10', '0.534 to nearest 16th']).total, '10.563…');
  assert.equal(sheet(['10', '0.534 to nearest 16th', 'sum']).rows[2], '10.563…');
  assert.equal(sheet(['10', '0.534 to nearest 16th', 'average']).rows[2], '5.281…');
  assert.equal(sheet(['w = 0.534 to nearest 16th', 'w * 16', 'w * 16']).total, '18');
});

test('NUM-04: a BigNumber result counts too', () => {
  assert.equal(sheet(['bignumber(5)', '2']).total, '7');
  assert.equal(sheet(['bignumber(5)', '2', 'sum']).rows[2], '7');
  assert.equal(sheet(['bignumber(0.1) + bignumber(0.2)', '1']).total, '1.3');
});

test('NUM-04: a Fraction counts in a tag total and a group subtotal', () => {
  assert.equal(sheet(['0.534 to nearest 16th #x', '10 #x', '#x']).rows[2], '10.563…');
  assert.equal(sheet(['Group:', '10', '0.534 to nearest 16th', 'end']).rows[0], '10.563…');
});

test('NUM-04: a Fraction and a unit are not silently mixed into one number', () => {
  const { rows } = sheet(['10 kg', '0.534 to nearest 16th', 'sum']);
  assert.equal(rows[2], '10.563… kg', 'bare numbers fold into the unit, as plain numbers do');
});
