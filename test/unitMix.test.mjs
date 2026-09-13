import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create, all } from '../js/lib/math.bundle.min.js';
import { registerRates } from '../js/eval/currency.js';
import { unitMixError } from '../js/core/unitMix.js';
import { evaluateLines, registerCurrencyRates } from '../js/core/calculate.js';

const math = create(all);
registerRates(math, { base: 'EUR', rates: { USD: 1.16, BRL: 5.9 } });
const mix = (expression) => unitMixError(math.evaluate(expression));

test('unitMixError allows meaningful units', () => {
  for (const expression of [
    '350 USD',
    '100 USD / hour',
    '5 USD / km',
    '5 km / USD',
    '350 USD * 3',
    '24 USD / day * 1 year',
    '5 m * 3 m',
    '5 m * 3 m * 2 m',
    '22 kg / (2 m)^2',
    '5 m / 2 s',
    '5 m / 2 s^2',
    '5 N * 2 m',
    '1 J',
  ]) {
    assert.equal(mix(expression), null, expression);
  }
});

test('unitMixError rejects a product of two kinds', () => {
  assert.equal(mix('5 kg * 3 m'), 'Cannot combine "kg" and "m" — that unit has no meaning');
  assert.equal(mix('2 h * 3 kg'), 'Cannot combine "h" and "kg" — that unit has no meaning');
  assert.equal(mix('5 GB * 2 m'), 'Cannot combine "GB" and "m" — that unit has no meaning');
  assert.equal(mix('6 degC kg'), 'Cannot combine "degC" and "kg" — that unit has no meaning');
});

test('unitMixError rejects a power that is not length area or volume', () => {
  assert.equal(mix('2 h * 3 h'), '"h" cannot be used with that power');
  assert.equal(mix('5 kg^2'), '"kg" cannot be used with that power');
  assert.equal(mix('(4 m)^0.5'), '"m" cannot be used with that power');
});

test('unitMixError keeps the currency messages', () => {
  assert.equal(
    mix('50 BRL * 1 hour'),
    'Cannot multiply a currency by "hour" — use a rate like "BRL per hour"'
  );
  assert.equal(
    mix('5 km * 2 USD'),
    'Cannot multiply a currency by "km" — use a rate like "USD per km"'
  );
  assert.equal(mix('5 USD * 2 EUR'), 'Cannot multiply currencies together');
  assert.equal(mix('5 USD * USD'), 'Cannot multiply currencies together');
});

test('unitMixError ignores values without units', () => {
  assert.equal(mix('5 km + 2 km'), null);
  assert.equal(mix('42'), null);
  assert.equal(unitMixError([1, 2, 3]), null);
});

test('evaluateLines reports a unit mix as an error', () => {
  registerCurrencyRates({ base: 'EUR', rates: { USD: 1.16, BRL: 5.9 } });
  const { results } = evaluateLines(['5 kg * 3 m', '350brl', '2h * prev']);
  assert.equal(results[0].type, 'error');
  assert.match(results[0].value, /Cannot combine "kg" and "m"/);
  assert.equal(results[1].type, 'value');
  assert.equal(results[2].type, 'error');
  assert.match(results[2].value, /Cannot multiply a currency by "hour"/);
});
