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

test('an aggregate word that is a field name or a parameter is not an aggregate', () => {
  assert.equal(show(['stats = {count: 4, sum: 10, avg: 2.5}', 'stats.avg']), '2.5');
  assert.equal(show(['stats = {count: 4, sum: 10, avg: 2.5}', 'stats.sum']), '10');
  assert.equal(show(['invoice = {subtotal: 120, tax: 12, total: 132}', 'invoice.total']), '132');
  assert.equal(show(['stats = {avg: 2.5, sum: 10}', 'stats["sum"]']), '10');
  assert.equal(show(['rent = 1000', 'tip = f(total) = total * 0.15', 'tip(80)']), '12');
  assert.equal(show(['10', '20', 'half = f(avg) = avg / 2', 'half(100)']), '50');
  assert.equal(show(['g = f(x, sum) = x + sum', 'g(1, 2)']), '3');
});

test('an aggregate word still works beside fields and functions', () => {
  assert.equal(show(['10', '20', 'sum']), '30');
  assert.equal(show(['10', '20', 'obj = {a: sum}', 'obj.a']), '30');
  assert.equal(show(['10', '20', 'h = f(x) = x + sum', 'h(1)']), '31');
  assert.equal(show(['10', '20', 'average * 2']), '30');
});
