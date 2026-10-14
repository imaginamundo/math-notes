import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create, all } from '../js/lib/math.bundle.min.js';
import { assertBoundedExpression } from '../js/core/boundedExpression.js';

const math = create(all);
const check = (expression, scope = {}) => assertBoundedExpression(math, expression, scope);

test('ordinary expressions are never parsed or limited', () => {
  assert.doesNotThrow(() => check('1 + 2'));
  assert.doesNotThrow(() => check('sqrt(16) * 3'));
});

test('a list literal at the limit is fine and one past it is rejected', () => {
  const list = (n) => `[${Array.from({ length: n }, (_, i) => i).join(', ')}]`;
  assert.doesNotThrow(() => check(list(100)));
  assert.throws(() => check(list(101)), /Lists are limited to 100 items/);
});

test('a range is bounded by its resolved size', () => {
  assert.doesNotThrow(() => check('1:100'));
  assert.throws(() => check('1:101'), /Ranges are limited to 100 items/);
  assert.throws(() => check('1:1000000000'), /Ranges are limited to 100 items/);
});

test('a range with a step counts only the elements it produces', () => {
  assert.doesNotThrow(() => check('0:100:1000'));
  assert.throws(() => check('0:1:1000'), /Ranges are limited/);
});

test('a descending range materialises nothing', () => {
  assert.doesNotThrow(() => check('1000:1'));
  assert.doesNotThrow(() => check('range(1000, 1)'));
});

test('a range whose end comes from the scope is resolved', () => {
  assert.throws(() => check('1:n', { n: 5000 }), /Ranges are limited/);
  assert.doesNotThrow(() => check('1:n', { n: 5 }));
});

test('a bound that cannot be resolved is left to evaluation', () => {
  assert.doesNotThrow(() => check('1:unknownName'));
});

test('range() is bounded in every argument form', () => {
  assert.doesNotThrow(() => check('range(1, 100)'));
  assert.throws(() => check('range(1, 1e9)'), /Ranges are limited/);
  assert.throws(() => check('range(1e9)'), /Ranges are limited/);
  assert.throws(() => check('range(0, 1e9, 1)'), /Ranges are limited/);
  assert.doesNotThrow(() => check('range(0, 1e9, 1e8)'));
});

test('ones and zeros are bounded by the product of their sizes', () => {
  assert.doesNotThrow(() => check('ones(10, 10)'));
  assert.throws(() => check('ones(1e5, 1e5)'), /Lists are limited/);
  assert.throws(() => check('zeros(101)'), /Lists are limited/);
  assert.doesNotThrow(() => check('zeros(0, 1e9)'), 'an empty dimension makes an empty array');
});

test('a malformed expression is left for evaluate to report', () => {
  assert.doesNotThrow(() => check('[1, 2'));
  assert.doesNotThrow(() => check('1 +: 2'));
});

test('PRE-01: assigning past the end of a list is bounded like building one', () => {
  assert.throws(() => check('n[1000000000] = 1'), /Lists are limited to 100 items/);
  assert.throws(() => check('n[1, 5000] = 1'), /Lists are limited/);
  assert.throws(() => check('n[idx] = 1', { idx: 100000 }), /Lists are limited/);
  assert.throws(() => check('n[[1, 2, 100000]] = 1'), /Lists are limited/);
  assert.doesNotThrow(() => check('n[5] = 1'));
  assert.doesNotThrow(() => check('n[1:5] = 1'));
  assert.doesNotThrow(() => check('n[100] = 1'));
  assert.doesNotThrow(
    () => check('n[end + 1] = 1'),
    'an index that needs the list is left to evaluation'
  );
});
