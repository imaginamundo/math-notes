import { test } from 'node:test';
import assert from 'node:assert/strict';
import formatResult from '../js/formatResult.js';
import { create, all } from '../js/lib/math.bundle.min.js';

const math = create(all);

test('formatResult groups large numbers', () => {
  assert.equal(formatResult(1000000), '1,000,000');
  assert.equal(formatResult(1234567.89), '1,234,567.89');
});

test('formatResult trims long decimals', () => {
  assert.equal(formatResult(0.1 + 0.2), '0.3');
  assert.equal(formatResult(1 / 3), '0.3333333333');
});

test('formatResult keeps integers simple', () => {
  assert.equal(formatResult(2), '2');
  assert.equal(formatResult(0), '0');
});

test('formatResult uses exponential for extreme values', () => {
  assert.equal(formatResult(1e21), '1e+21');
  assert.equal(formatResult(1e-8), '1e-8');
});

test('formatResult passes through strings and other types', () => {
  assert.equal(formatResult('hello'), 'hello');
  assert.equal(formatResult(null), 'null');
});

test('formatResult formats units with grouped values', () => {
  assert.equal(formatResult(math.unit(0.01, 'm')), '0.01 m');
  assert.equal(formatResult(math.unit(1000000, 'm')), '1,000,000 m');
});

test('formatResult keeps unit prefixes', () => {
  assert.equal(formatResult(math.unit(2.5, 'km')), '2.5 km');
  assert.equal(formatResult(math.unit(3, 'GB')), '3 GB');
  math.createUnit('px', { definition: `${0.0254 / 96} m` });
  const converted = formatResult(math.evaluate('1 cm in px'));
  assert.match(converted, /^37\.7952755906 px$/);
});
