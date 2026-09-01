import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/core/calculate.js';

test('ton defaults to the metric tonne', () => {
  const ton = evaluateLines(['1 ton in kg']).results[0].value;
  assert.ok(Math.abs(ton.toNumeric('kg') - 1000) < 1e-9);
  const pounds = evaluateLines(['2 ton in lb']).results[0].value;
  assert.ok(Math.abs(pounds.toNumeric('lb') - 4409.245243697552) < 1e-6);
});
