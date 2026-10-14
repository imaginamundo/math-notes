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
