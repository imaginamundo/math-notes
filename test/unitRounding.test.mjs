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

// REVIEW.md NUM-05: a bare step was read in the first unit of a multi-part
// duration (`2 hours 17 minutes to nearest 15` rounded in hours and gave 0 s).
test('NUM-05: a multi-part duration rounds in the smallest unit written', () => {
  assert.equal(show('2 hours 17 minutes to nearest 15'), '2 hours 15 minutes');
  assert.equal(show('17 minutes 2 hours to nearest 15'), '2 hours 15 minutes');
  assert.equal(show('2h 17min to nearest 15'), '2 hours 15 minutes');
  assert.equal(show('3 hours 50 minutes to nearest 5'), '3 hours 50 minutes');
  assert.equal(show('2 days 5 hours to nearest 12'), '2 days');
  assert.equal(show('2 hours 17 minutes rounded down to nearest 15'), '2 hours 15 minutes');
  assert.equal(show('137 minutes to nearest 15'), '2 hours 15 minutes');
});

test('NUM-05: the step may carry its own unit', () => {
  assert.equal(show('2 hours 17 minutes to nearest 15 minutes'), '2 hours 15 minutes');
  assert.equal(show('2 hours 17 minutes to nearest 30 min'), '2 hours 30 minutes');
  assert.equal(show('47 cm to nearest 5 cm'), '45 cm');
  assert.equal(show('$47 to nearest 5 USD'), 'US$ 45');
});

// REVIEW.md NUM-06: fraction rounding failed on every unit or currency value with
// a leaked mathjs error.
test('NUM-06: to nearest Nth works on units and currencies', () => {
  assert.equal(show('2.3 in to nearest 16th'), '37/16 in');
  assert.equal(show('2.3 inch to nearest 8th'), '9/4 inch');
  assert.equal(show('$2.37 to nearest 4th'), 'US$ 9/4');
  assert.equal(show('5 m to nearest 2nd'), '5 m');
  assert.equal(show('-2.3 in to nearest 8th'), '-9/4 in');
});

test('NUM-06: plain numbers keep working, with or without "rounded"', () => {
  assert.equal(show('2.3 to nearest 16th'), '37/16');
  assert.equal(show('0.534 to nearest 16th'), '9/16');
  assert.equal(show('2.3 rounded to the nearest 16th'), '37/16');
  assert.equal(show('2.3 in rounded to the nearest 16th'), '37/16 in');
});
