import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/core/calculate.js';

test('ton defaults to the metric tonne', () => {
  const ton = evaluateLines(['1 ton in kg']).results[0].value;
  assert.ok(Math.abs(ton.toNumeric('kg') - 1000) < 1e-9);
  const pounds = evaluateLines(['2 ton in lb']).results[0].value;
  assert.ok(Math.abs(pounds.toNumeric('lb') - 4409.245243697552) < 1e-6);
});

const kg = (line) => evaluateLines([line]).results[0].value.toNumeric('kg');

test('tons is the plural of the metric ton, and kton works', () => {
  assert.equal(kg('2 ton in kg'), 2000);
  assert.equal(kg('2 tons in kg'), 2000);
  assert.equal(kg('1 ton + 1 tons in kg'), 2000);
  assert.equal(kg('1 kton in kg'), 1e6);
  assert.equal(kg('1 ktons in kg'), 1e6);
  assert.equal(kg('1000 kg in tons'), 1000);
});

test('household cooking densities match USDA and King Arthur cup weights', () => {
  // Grams in a US cup (236.588 ml), whichever cup the Settings choose.
  const cup = (name) =>
    evaluateLines([`236.588 ml ${name} in grams`]).results[0].value.toNumeric('g');
  const within = (actual, expected) => Math.abs(actual - expected) / expected < 0.03;
  assert.ok(within(cup('cocoa powder'), 85));
  assert.ok(within(cup('cornstarch'), 123));
  assert.ok(within(cup('oats'), 85));
  assert.ok(within(cup('powdered sugar'), 118));
  assert.ok(within(cup('whole wheat flour'), 118));
  assert.ok(within(cup('coconut sugar'), 154));
  assert.ok(cup('whole wheat flour') < cup('flour'), 'whole wheat is lighter than all-purpose');
});

test('carat, nautical mile, knot and the other listed units exist', () => {
  const to = (line, unit) => evaluateLines([line]).results[0].value.toNumeric(unit);
  assert.equal(to('1.5 ct in g', 'g'), 0.3);
  assert.equal(to('2 carats in mg', 'mg'), 400);
  assert.equal(to('10 nmi in m', 'm'), 18520);
  assert.equal(to('1 nm in m', 'm'), 1e-9, 'nm is still the nanometre');
  assert.ok(Math.abs(to('10 knots in km/h', 'km/h') - 18.52) < 1e-9);
  assert.equal(to('2 pounds in lb', 'lb'), 2);
  assert.equal(to('1 fathom in m', 'm'), 1.8288);
  assert.equal(to('1 furlong in m', 'm'), 201.168);
  assert.equal(to('2 metres in m', 'm'), 2);
});

test('a stick of butter is four ounces, half a US cup', () => {
  const grams = (line) => evaluateLines([line]).results[0].value.toNumeric('g');
  assert.ok(Math.abs(grams('1 stick in g') - 113.3980925) < 1e-6);
  assert.ok(Math.abs(grams('2 sticks butter in g') - 226.796185) < 1e-5);
});

test('short and digit unit names convert with a subject', () => {
  const kgOf = (line) => evaluateLines([line]).results[0].value.toNumeric('kg');
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, actual);
  near(kgOf('1 gallon water in kg'), 4);
  near(kgOf('1 gal water in kg'), 4);
  near(kgOf('1 m3 water in kg'), 1000);
  near(kgOf('1 pt water in kg'), 0.5);
  const gallons = evaluateLines(['1 kg water in gal']).results[0].value.toNumeric('gal');
  assert.ok(Math.abs(gallons - 0.25) < 1e-9);
  assert.ok(kgOf('100 obl oil in kg') > 10000);
});
