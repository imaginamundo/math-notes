import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// REVIEW.md NUM-07: rounding a unit or currency used binary Math.round/ceil/floor,
// so negative halves went toward +infinity, decimal halves rounded down, and a
// whole amount could be rounded up a whole step (`$10 rounded up to nearest 10`
// gave US$ 20). Numbers use mathjs's decimal-correct rounding; units must too.
const show = (line) => {
  const row = createEngine({ rates: FIXTURE_RATES }).evaluateLines([line]).results[0];
  return row.type === 'error' ? `ERR ${row.value}` : formatResult(row.value);
};

test('NUM-07: halves round away from zero, as they do for plain numbers', () => {
  assert.equal(show('2.5 m rounded'), '3 m');
  assert.equal(show('-2.5 m rounded'), '-3 m');
  assert.equal(show('-0.5 kg rounded'), '-1 kg');
  assert.equal(show('2.5 rounded'), '3');
  assert.equal(show('-2.5 rounded'), '-3');
});

test('NUM-07: decimal halves round up, not down', () => {
  assert.equal(show('1.005 m to 2 dp'), '1.01 m');
  assert.equal(show('$1.005 to 2 dp'), 'US$ 1.01');
  assert.equal(show('2.675 kg to 2 dp'), '2.68 kg');
});

test('NUM-07: a whole amount is not rounded up a whole step', () => {
  assert.equal(show('$10 rounded up to nearest 10'), 'US$ 10');
  assert.equal(show('$20 rounded up to nearest 10'), 'US$ 20');
  assert.equal(show('$11 rounded up to nearest 10'), 'US$ 20');
  assert.equal(show('30 m rounded up to nearest 10'), '30 m');
  assert.equal(show('$30 rounded down to nearest 10'), 'US$ 30');
  assert.equal(show('$29 rounded down to nearest 10'), 'US$ 20');
});

test('NUM-07: units behave like plain numbers for the same input', () => {
  for (const [input, expected] of [
    ['7.5', '8'],
    ['7.4', '7'],
    ['-7.5', '-8'],
  ]) {
    assert.equal(show(`${input} m rounded`), `${expected} m`, input);
    assert.equal(show(`${input} rounded`), expected, input);
  }
});

test('NUM-07: rounding keeps a timespan a timespan', () => {
  assert.equal(show('90 minutes rounded'), '1 hour 30 minutes');
  assert.equal(show('2.4 hours rounded'), '2 hours');
});
