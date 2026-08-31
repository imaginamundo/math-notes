import { test } from 'node:test';
import assert from 'node:assert/strict';
import { create, all } from '../js/lib/math.bundle.min.js';
import { preprocessSymbols, registerRates } from '../js/currency.js';

test('preprocessSymbols converts a symbol before a number', () => {
  assert.equal(preprocessSymbols('$5 to EUR'), '5 USD to EUR');
  assert.equal(preprocessSymbols('€10 to USD'), '10 EUR to USD');
  assert.equal(preprocessSymbols('£20.5 to JPY'), '20.5 GBP to JPY');
});

test('preprocessSymbols converts a symbol after a number', () => {
  assert.equal(preprocessSymbols('5$ to EUR'), '5 USD to EUR');
  assert.equal(preprocessSymbols('10 € in USD'), '10 EUR in USD');
});

test('preprocessSymbols maps symbols to ISO codes', () => {
  assert.equal(preprocessSymbols('¥100 to USD'), '100 JPY to USD');
  assert.equal(preprocessSymbols('₹500 to EUR'), '500 INR to EUR');
  assert.equal(preprocessSymbols('₺50 to EUR'), '50 TRY to EUR');
  assert.equal(preprocessSymbols('₩1000 to USD'), '1000 KRW to USD');
});

test('preprocessSymbols maps the R$ symbol to BRL', () => {
  assert.equal(preprocessSymbols('R$5 to USD'), '5 BRL to USD');
  assert.equal(preprocessSymbols('5R$ to EUR'), '5 BRL to EUR');
  assert.equal(preprocessSymbols('R$ 10 in USD'), '10 BRL in USD');
  assert.equal(preprocessSymbols('100 R$ to EUR'), '100 BRL to EUR');
  assert.equal(preprocessSymbols('R$5.50 to GBP'), '5.50 BRL to GBP');
});

test('preprocessSymbols leaves plain expressions untouched', () => {
  assert.equal(preprocessSymbols('2 + 2 * 3'), '2 + 2 * 3');
  assert.equal(preprocessSymbols('1cm to m'), '1cm to m');
});

test('preprocessSymbols uppercases currency codes', () => {
  assert.equal(preprocessSymbols('5usd to brl'), '5 USD to BRL');
  assert.equal(preprocessSymbols('100 usd to eur'), '100 USD to EUR');
  assert.equal(preprocessSymbols('gbp 5'), 'GBP 5');
  assert.equal(preprocessSymbols('50 eur in usd'), '50 EUR in USD');
});

test('preprocessSymbols keeps currency codes attached to numbers', () => {
  assert.equal(preprocessSymbols('5usd'), '5 USD');
  assert.equal(preprocessSymbols('usd5'), 'USD 5');
  assert.equal(preprocessSymbols('total = 5usd + 2'), 'total = 5 USD + 2');
});

test('preprocessSymbols leaves non-currency identifiers alone', () => {
  assert.equal(preprocessSymbols('pizzas * 2'), 'pizzas * 2');
  assert.equal(preprocessSymbols('myusd = 5'), 'myusd = 5');
  assert.equal(preprocessSymbols('5cm to m'), '5cm to m');
});

test('registerRates creates the base unit and overrides the rest', () => {
  const created = [];
  const math = {
    createUnit(name, definition, options) {
      created.push({ name, definition: definition && definition.definition, options });
    }
  };

  registerRates(math, { base: 'EUR', rates: { USD: 1.1596, GBP: 0.85662 } });
  registerRates(math, { base: 'EUR', rates: { USD: 1.2 } });

  assert.equal(created.length, 5);
  assert.deepEqual(created[0], { name: 'EUR', definition: undefined, options: undefined });
  assert.equal(created[1].name, 'USD');
  assert.match(created[1].definition, /^0\.86236633\d+ EUR$/);
  assert.deepEqual(created[1].options, { override: true });
  assert.equal(created[2].name, 'GBP');
  assert.equal(created[3].name, 'EUR');
  assert.equal(created[4].name, 'USD');
  assert.match(created[4].definition, /^0\.83333333\d+ EUR$/);
});

test('registerRates ignores data with a foreign base', () => {
  const math = { createUnit: () => { throw new Error('should not be called'); } };
  assert.doesNotThrow(() => registerRates(math, { base: 'USD', rates: { EUR: 0.9 } }));
});

function closeTo(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, got ${actual}`);
}

test('currency conversion evaluates through the registered units', () => {
  const math = create(all);
  registerRates(math, { base: 'EUR', rates: { USD: 1.1596, GBP: 0.85662, JPY: 185.2 } });

  closeTo(math.evaluate('100 USD to EUR').toNumeric('EUR'), 86.23663332183511, 'USD to EUR');
  closeTo(math.evaluate('100 GBP to JPY').toNumeric('JPY'), 21619.85477808129, 'GBP to JPY');
  closeTo(math.evaluate(preprocessSymbols('$50 to GBP')).toNumeric('GBP'), 36.9360124180752, 'symbol USD to GBP');
  closeTo(math.evaluate('1 EUR in USD').toNumeric('USD'), 1.1596, 'EUR to USD');
});
