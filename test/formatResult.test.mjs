import { test } from 'node:test';
import assert from 'node:assert/strict';
import formatResult from '../js/render/formatResult.js';
import { registerRates } from '../js/eval/currency.js';
import { create, all } from '../js/lib/math.bundle.min.js';

const math = create(all);
registerRates(math, {
  base: 'EUR',
  rates: { USD: 1.16, GBP: 0.86, JPY: 170, BRL: 6.2, CAD: 1.5, CHF: 0.94 },
});

test('formatResult groups large numbers', () => {
  assert.equal(formatResult(1000000), '1,000,000');
  assert.equal(formatResult(1234567.89), '1,234,567.89');
});

test('formatResult trims long decimals to the precision with an ellipsis', () => {
  assert.equal(formatResult(0.1 + 0.2), '0.3');
  assert.equal(formatResult(1 / 3), '0.333…');
  assert.equal(formatResult(1 / 3, 10), '0.3333333333');
  assert.equal(formatResult(1.5), '1.5');
  assert.equal(formatResult(1234.5678, 2), '1,234.57…');
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
  assert.equal(converted, '37.795… px');
});

test('formatResult writes currencies with their symbols', () => {
  assert.equal(formatResult(math.evaluate('350 USD')), 'US$ 350');
  assert.equal(formatResult(math.evaluate('350 EUR')), '€ 350');
  assert.equal(formatResult(math.evaluate('50 GBP')), '£ 50');
  assert.equal(formatResult(math.evaluate('50 JPY')), '¥ 50');
  assert.equal(formatResult(math.evaluate('5 BRL')), 'R$ 5');
  assert.equal(formatResult(math.evaluate('5 CAD')), 'CA$ 5');
  assert.equal(formatResult(math.evaluate('-50 USD')), '-US$ 50');
});

test('formatResult keeps codes for currencies without a symbol', () => {
  assert.equal(formatResult(math.evaluate('5 CHF')), '5 CHF');
});

test('formatResult writes currency rates as a phrase', () => {
  assert.equal(formatResult(math.evaluate('100 USD / hour')), 'US$ 100 per hour');
  assert.equal(formatResult(math.evaluate('360 BRL / 30 days')), 'R$ 12 per day');
  assert.equal(formatResult(math.evaluate('10 USD / day')), 'US$ 10 per day');
  assert.equal(formatResult(math.evaluate('5 km / day')), '5 km/day');
});

test('formatResult writes a compound that simplifies to a currency', () => {
  assert.equal(formatResult(math.evaluate('24 USD / day * 1 year')), 'US$ 8,766');
});

test('formatResult keeps the written currency when a compound reduces', () => {
  assert.equal(formatResult(math.evaluate('2 h * (33 USD / hour)')), 'US$ 66');
  assert.equal(formatResult(math.evaluate('2 h * (33 BRL / hour)')), 'R$ 66');
});

test('formatResult keeps a plain ratio as written', () => {
  // `l/km` is area by dimension, but the user meant a rate, so it stays.
  assert.equal(formatResult(math.evaluate('7 l / 100 km')), '0.07 l/km');
  assert.equal(formatResult(math.evaluate('5 km / 1 l')), '5 km/l');
  assert.equal(formatResult(math.evaluate('30 mile / gallon')), '30 mile/gallon');
  assert.equal(formatResult(math.evaluate('5 kg / m^3')), '5 kg/m^3');
});

test('formatResult combines repeated unit factors into a power', () => {
  assert.equal(formatResult(math.evaluate('5 m * 3 m * 2 m')), '30 m^3');
  assert.equal(formatResult(math.evaluate('5 cm * 3 cm * 2 cm')), '30 cm^3');
  assert.equal(formatResult(math.evaluate('5 m^2 * 2 m')), '10 m^3');
});

test('formatResult shows fractions as fractions', () => {
  assert.equal(formatResult(math.fraction(9, 16)), '9/16');
  assert.equal(formatResult(math.fraction(-9, 16)), '-9/16');
  assert.equal(formatResult(math.fraction(4, 2)), '2');
});

test('formatResult shows short lists in full', () => {
  assert.equal(formatResult([1, 2, 3, 4, 5]), '[1, 2, 3, 4, 5]');
  assert.equal(formatResult(math.matrix([1, 2, 3])), '[1, 2, 3]');
});

test('formatResult compacts long lists', () => {
  const out = formatResult(Array.from({ length: 100 }, (_, i) => i + 1));
  assert.match(out, /^\[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, …, 100\]$/);
});

test('formatResult renders plain objects instead of [object Object]', () => {
  assert.equal(formatResult({ a: 1, b: 2 }), '{ a: 1, b: 2 }');
  assert.equal(formatResult({}), '{}');
  assert.equal(formatResult({ a: { b: 2 } }), '{ a: { b: 2 } }');
  assert.equal(formatResult({ 'a b': 1 }), '{ "a b": 1 }');
  assert.equal(formatResult({ d: math.unit(1, 'cm') }), '{ d: 1 cm }');
  assert.equal(formatResult([{ a: 1 }, 2]), '[{ a: 1 }, 2]');
});

test('formatResult compacts long objects and leaves non-plain objects alone', () => {
  const obj = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, i]));
  assert.match(formatResult(obj), /^\{ k0: 0, .*…, k19: 19 \}$/);
  const complex = math.evaluate('1 + 2i');
  assert.equal(formatResult(complex), String(complex));
});

// The unit-display rules are an ordered list; these pin the order where more
// than one rule could apply, so a future reorder is caught.
test('formatUnit applies its rules in order', () => {
  // A computed duration (a compound that reduces to time) is a timespan...
  assert.equal(formatResult(math.evaluate('3 GB / (10 MB / s)')), '5 min');
  // ...but an explicit seconds conversion keeps its unit.
  assert.equal(formatResult(math.evaluate('2 h to s')), '7,200 s');
  // A currency amount is a symbol before it is a generic unit.
  assert.equal(formatResult(math.evaluate('350 USD')), 'US$ 350');
  // A currency rate is a phrase.
  assert.equal(formatResult(math.evaluate('100 USD / hour')), 'US$ 100 per hour');
  // A compound that cancels to a currency keeps the written currency.
  assert.equal(formatResult(math.evaluate('24 USD / day * 1 year')), 'US$ 8,766');
  // A repeated same-unit product is a power before the simplified volume unit.
  assert.equal(formatResult(math.evaluate('2 m * 3 m * 4 m')), '24 m^3');
  // A plain ratio stays as written rather than simplifying to an area.
  assert.equal(formatResult(math.evaluate('7 l / 100 km')), '0.07 l/km');
});
