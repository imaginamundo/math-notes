import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// A bare `N%` followed by a binary + or - was read by mathjs as the remainder
// operator (`50 + 10% + 1` became `50 + (10 % (+1))` and gave 50), and a leading
// minus before `on`/`off` negated the base instead of the percentage.
const show = (lines, index = lines.length - 1) => {
  const row = createEngine({ rates: FIXTURE_RATES }).evaluateLines(lines).results[index];
  return row.type === 'error' ? `ERR ${row.value}` : formatResult(row.value);
};
const num = (line) => {
  const row = createEngine().evaluateLines([line]).results[0];
  return row.type === 'error' ? `ERR ${row.value}` : Number(Number(row.value).toPrecision(12));
};

test('a percentage followed by + or - is a percentage, not a remainder', () => {
  assert.equal(num('50 + 10%'), 55);
  assert.equal(num('50 + 10% + 1'), 56);
  assert.equal(num('50 + 10% - 1'), 54);
  assert.equal(num('10% + 5%'), 0.15);
  assert.equal(num('5% + 10'), 10.05);
  assert.equal(num('100 + 5% + 5%'), 110.25);
  assert.equal(num('5% - 1'), -0.95);
  assert.equal(num('100 - 20% - 10%'), 72);
  assert.equal(num('200 + 15% - 20'), 210);
  assert.equal(num('10%+3'), 3.1);
  assert.equal(num('7% - 2'), -1.93);
});

test('a percentage in a variable or a product chains too', () => {
  assert.equal(show(['x = 10', 'x% + 5']), '5.1');
  assert.equal(show(['bill = 100', 'bill * 10% + 5']), '15');
  assert.equal(show(['price = 50 + 10% + 1', 'price']), '56');
  assert.equal(show(['tax = 10%', '50 + tax + 1']), '51.1', 'a variable holds 0.1');
});

test('percentage chains work with units and currencies', () => {
  assert.equal(show(['50 EUR + 10% + 5 EUR']), '€ 60');
  assert.equal(show(['50 kg + 10% + 1 kg']), '56 kg');
  assert.equal(show(['$50 + 10% + $1']), 'US$ 56');
});

test('percentages inside parentheses and arguments keep their own chains', () => {
  assert.equal(num('(50 + 10%) + 1'), 56);
  assert.equal(num('2 * (50 + 10% + 1)'), 112);
  assert.equal(num('max(50 + 10% + 1, 3)'), 56);
  assert.equal(num('1 + 50 + 10%'), 56.1);
});

test('the remainder operator and plain percentages are unchanged', () => {
  assert.equal(num('10 % 3'), 1);
  assert.equal(num('17 % 5'), 2);
  assert.equal(num('10 - 40%'), 6);
  assert.equal(num('40%'), 0.4);
  assert.equal(num('50 + 10%'), 55);
  assert.equal(num('100 * 15%'), 15);
});

test('a signed percentage before on and off applies to the percentage', () => {
  assert.equal(num('-20% on 50'), 40);
  assert.equal(num('-10% on 100'), 90);
  assert.equal(num('-5% off 40'), 42);
  assert.equal(num('-20% on -50'), -40);
  assert.equal(num('-20% of 50'), -10);
  assert.equal(num('- 20% on 50'), 40);
  assert.equal(num('-0.5% on 200'), 199);
  assert.equal(num('-.5% on 200'), 199);
  assert.ok(Math.abs(num('-5% on what is 6') - 6 / 0.95) < 1e-9);
  assert.ok(Math.abs(num('-5% off what is 6') - 6 / 1.05) < 1e-9);
  assert.equal(show(['-20% off 50 kg']), '60 kg');
  assert.equal(show(['-20% on $50']), 'US$ 40');
  assert.equal(show(['-20% on 50 EUR']), '€ 40');
});

test('a binary minus before a percent phrase is not read as its sign', () => {
  assert.equal(num('100 - 20% on 50'), 40);
  assert.equal(num('5 * -20% of 50'), -50);
});

// A percent phrase took everything to the end of the line as its operand, so it also
// scaled the terms before it's own, ignored the parentheses around it, and broke a
// second phrase or a rounding phrase on the same line.
test('a phrase after other terms applies only to its own operand', () => {
  assert.equal(num('100 + 5% on 30'), 131.5);
  assert.equal(num('100 - 5% on 30'), 68.5);
  assert.equal(num('100 + 5% off 30'), 128.5);
  assert.equal(num('10 + 20% off 50'), 50);
  assert.equal(num('10 + 20% of 50'), 20);
  assert.equal(num('2 * 5% on 30'), 63);
  assert.equal(show(['$100 + 20% off $50']), 'US$ 140');
  assert.equal(show(['50 kg + 10% on 20 kg']), '72 kg');
});

test('a phrase inside parentheses or a call is self-contained', () => {
  assert.equal(num('100 + (5% on 30)'), 131.5);
  assert.equal(num('(5% on 30) + 100'), 131.5);
  assert.equal(num('(20% of 50) + 5'), 15);
  assert.equal(num('(20% off 50) + 10'), 50);
  assert.equal(num('max(20% of 50, 3)'), 10);
  assert.equal(num('sqrt(20% of 80) + 1'), 5);
  assert.equal(num('2 * (10% on 100)'), 220);
});

test('the rest of the line is still the operand of a phrase on its own', () => {
  assert.equal(num('10% of 50 + 5'), 5.5);
  assert.equal(num('10% of 50 - 5'), 4.5);
  assert.equal(num('20% off 50 + 10'), 48);
  assert.equal(num('5% on 30 + 10'), 42);
  assert.equal(num('20% of 10 + 5'), 3);
});

test('two phrases on one line are two phrases', () => {
  assert.equal(num('10% of 50 + 10% of 20'), 7);
  assert.equal(num('10% of 50 - 10% of 20'), 3);
  assert.equal(num('100 + 10% of 50 + 5% on 20'), 126);
});

test('a percentage held in a variable works in a phrase', () => {
  assert.equal(show(['x = 25', 'x% of 80']), '20');
  assert.equal(show(['rate = 10', 'rate% on 200']), '220');
  assert.equal(show(['price = 50', '20% off price']), '40');
});

test('a rounding or conversion phrase after a percent phrase applies to its result', () => {
  assert.equal(num('20% of 10 to 2 dp'), 2);
  assert.equal(num('5% on 100 to 2 dp'), 105);
  assert.equal(num('20% of 50 to nearest 4'), 12);
  assert.equal(num('1/3 of 10 to 2 dp'.replace('1/3 of', '33.3333% of')), 3.33);
  assert.match(show(['5% on 30 USD in EUR']), /€/);
  assert.equal(show(['20% of 30 hours']), '6 hours');
});
