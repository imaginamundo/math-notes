import { test } from 'node:test';
import assert from 'node:assert/strict';
import formatResult, { serializeResults } from '../js/render/formatResult.js';
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
  assert.equal(formatResult(1 / 3, 10), '0.3333333333…', 'the ellipsis shows at 10 places too');
  assert.equal(formatResult(1.5), '1.5');
  assert.equal(formatResult(1234.5678, 2), '1,234.57…');
});

test('formatResult formats a BigNumber with the chosen precision', () => {
  const value = math.bignumber('1.23456789');
  assert.equal(formatResult(value, 3), '1.235…');
  assert.equal(formatResult(value, 6), '1.234568…');
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

test('serializeResults formats values and keeps clone-safe flags, dropping assigned', () => {
  const results = [
    { type: 'value', value: 1000000, aggregate: true, tags: ['food'], group: 'header' },
    { type: 'assignment', value: 5, assigned: () => {}, unitDef: true },
    { type: 'error', value: 'boom' },
    { type: 'value', value: undefined },
  ];
  const out = serializeResults(results, 2, '24h');
  assert.deepEqual(out[0], {
    type: 'value',
    value: '1,000,000',
    aggregate: true,
    unitDef: undefined,
    tags: ['food'],
    group: 'header',
  });
  assert.equal(out[1].value, '5');
  assert.equal(out[1].assigned, undefined, 'assigned cannot cross structured clone');
  assert.equal(out[1].unitDef, true);
  assert.deepEqual(out[2], {
    type: 'error',
    value: 'boom',
    aggregate: undefined,
    unitDef: undefined,
    tags: undefined,
    group: undefined,
  });
  assert.equal(out[3].value, undefined);
});

// REVIEW.md NUM-03: float residue (about 1e-16) skipped the precision setting and
// was drawn as ten digits of exponent. Nothing that small can be a real result of
// the arithmetic here, so it reads as "0 with more behind it", like 0.0001 does.
test('NUM-03: float residue reads 0… instead of an exponent', () => {
  assert.equal(formatResult(5.5511151231e-17), '0…');
  assert.equal(formatResult(-5.5511151231e-17), '0…');
  assert.equal(formatResult(1e-13), '0…');
  assert.equal(formatResult(2.7755575615628914e-17, 8), '0…');
});

test('NUM-03: genuinely small values and the large cutoff are unchanged', () => {
  assert.equal(formatResult(1e-8), '1e-8');
  assert.equal(formatResult(1.5e-9), '1.5e-9');
  assert.equal(formatResult(1e16), '1e+16');
  assert.equal(formatResult(0), '0');
});

// REVIEW.md NUM-12: a fixed 1e-9 tolerance hid the ellipsis at precision 9 and 10,
// for large values, and on every scientific result.
test('NUM-12: the ellipsis marks every cut, whatever the precision or magnitude', () => {
  assert.equal(formatResult(1 / 3, 9), '0.333333333…');
  assert.equal(formatResult(10 / 3, 9), '3.333333333…');
  assert.equal(formatResult(Math.PI, 10), '3.1415926536…');
  assert.equal(formatResult(1000000 / 3), '333,333.333…');
  assert.equal(formatResult(9876543.21987), '9,876,543.22…');
  assert.equal(formatResult(1234567.891, 2), '1,234,567.89…');
  assert.equal(formatResult(1000000000.4, 0), '1,000,000,000…');
  assert.equal(formatResult(499999.1234), '499,999.123…');
});

test('NUM-12: a value that is exact at the precision has no ellipsis', () => {
  assert.equal(formatResult(1.5), '1.5');
  assert.equal(formatResult(1000000), '1,000,000');
  assert.equal(formatResult(0.125, 3), '0.125');
  assert.equal(formatResult(9876543.22, 2), '9,876,543.22');
});

test('NUM-12: scientific results follow the precision and mark a cut', () => {
  assert.equal(formatResult(2 ** 64), '1.845e+19…');
  assert.equal(formatResult(2 ** 64, 10), '1.8446744074e+19…');
  assert.equal(formatResult(2 ** 64, 0), '2e+19…');
  assert.equal(formatResult(1e21), '1e+21');
  assert.equal(formatResult(1e-8), '1e-8');
  assert.equal(formatResult(1.5e-9), '1.5e-9');
});

// REVIEW.md CUR-02: 1 ulp of binary noise (700000.0000000001) was shown as exact
// trailing digits, and a value shown with no ellipsis is meant to be exact.
test('CUR-02: float noise past 15 significant digits is not displayed', () => {
  assert.equal(formatResult(700000.0000000001, 10), '700,000');
  assert.equal(formatResult(29999999999999.996), '30,000,000,000,000');
  assert.equal(formatResult(1000000.2999999999, 10), '1,000,000.3');
  assert.equal(formatResult(999999999.9999999, 10), '1,000,000,000');
  assert.equal(formatResult(0.1 + 0.2, 10), '0.3');
});
