import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import { maskStrings, outsideStrings } from '../js/core/stringMask.js';
import formatResult from '../js/render/formatResult.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

const show = (lines, index = lines.length - 1) => {
  const row = createEngine({ rates: FIXTURE_RATES }).evaluateLines(lines).results[index];
  return row.type === 'error' ? `ERR ${row.value}` : formatResult(row.value);
};

test('maskStrings hides quoted text and restores it exactly', () => {
  const { text, restore } = maskStrings('a "x \\" y" + \'z\' + b');
  assert.ok(!text.includes('x'));
  assert.equal(restore(text), 'a "x \\" y" + \'z\' + b');
  assert.equal(restore(text.replace('a', 'A')), 'A "x \\" y" + \'z\' + b');
});

test('an unclosed quote is not a string', () => {
  const { text } = maskStrings('5 + "abc');
  assert.equal(text, '5 + "abc');
});

test('outsideStrings rewrites only the code between strings', () => {
  assert.equal(
    outsideStrings('total "total" total', (t) => t.replace(/total/g, 'X')),
    'X "total" X'
  );
});

test('quoted text is returned as typed, whatever it looks like', () => {
  for (const text of [
    '2k items',
    'a times b',
    '1h 30m',
    'usd 5',
    'total',
    '50% of 10',
    '9:00 to 17:00',
  ]) {
    assert.equal(show([`"${text}"`]), text, text);
  }
});

test('aggregate keywords and multi-word names inside a string are left alone', () => {
  assert.equal(show(['10', '20', '"total"']), 'total');
  assert.equal(show(['my rate = 5', '"my rate"']), 'my rate');
  assert.equal(show(['my rate = 5', 'concat("my rate", "!")']), 'my rate!');
  assert.equal(show(['10', '20', 'concat("sum: ", string(sum))']), 'sum: 30');
});
