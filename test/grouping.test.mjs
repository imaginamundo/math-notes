import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// Results print with thousands separators (1,500) and Copy result copies that text,
// but pasting it back was a syntax error, and inside a call or a list the comma
// silently split the number into two arguments.
const show = (lines, index = lines.length - 1) => {
  const row = createEngine({ rates: FIXTURE_RATES }).evaluateLines(lines).results[index];
  return row.type === 'error' ? `ERR ${row.value}` : formatResult(row.value);
};
const one = (line) => show([line], 0);

test('a grouped number outside brackets is one number', () => {
  assert.equal(one('1,500'), '1,500');
  assert.equal(one('1,500 + 2'), '1,502');
  assert.equal(show(['y = 1,500', 'y']), '1,500');
  assert.equal(one('1,234.56'), '1,234.56');
  assert.equal(one('$1,000'), 'US$ 1,000');
  assert.equal(one('1,000 USD'), 'US$ 1,000');
  assert.equal(one('US$ 1,000'), 'US$ 1,000');
  assert.equal(one('1,234,567 + 1'), '1,234,568');
  assert.equal(one('2 * 1,500'), '3,000');
});

test('grouped numbers in a call or list whose separators have spaces are single numbers', () => {
  assert.equal(one('sum(1,000, 2,000)'), '3,000');
  assert.equal(one('max(1,500, 900)'), '1,500');
  assert.equal(one('mean(1,200, 1,800)'), '1,500');
  assert.equal(one('[1,000, 2,000]'), '[1,000, 2,000]');
  assert.equal(one('sum([1,000, 2,000, 3])'), '3,003');
  assert.equal(show(['x = [1,000, 2,000]', 'sum(x)']), '3,000');
});

test('a comma with no space and no spaced separator beside it stays a separator', () => {
  assert.equal(one('max(10,200)'), '200');
  assert.equal(one('sum(1,2,3)'), '6');
  assert.equal(one('[1,234]'), '[1, 234]');
  assert.equal(one('max(10, 200)'), '200');
});

test('ordinary lines and lists are unaffected', () => {
  assert.equal(one('1500 + 2'), '1,502');
  assert.equal(one('[1, 2, 3]'), '[1, 2, 3]');
  assert.equal(one('sum(1000, 2000)'), '3,000');
  assert.equal(one('1.5 + 1,000'), '1,001.5');
});

test('Copy result text is read back as the same number', async () => {
  const { ungroupDisplay } = await import('../js/core/numberGrouping.js');
  assert.equal(ungroupDisplay('1,500'), '1500');
  assert.equal(ungroupDisplay('US$ 1,234,567.5'), 'US$ 1234567.5');
  assert.equal(ungroupDisplay('[1000, 2,000]'), '[1000, 2000]');
  assert.equal(ungroupDisplay('[1, 2, 3]'), '[1, 2, 3]');
  assert.equal(ungroupDisplay('1,234.5 km'), '1234.5 km');
  assert.equal(ungroupDisplay('12 + 345'), '12 + 345');
  // The round trip: what is copied evaluates to the same value.
  for (const line of ['1000 + 500', '1234567 * 3', '[1000, 2500]']) {
    const value = show([line], 0);
    assert.equal(show([ungroupDisplay(value)], 0), value, line);
  }
});
