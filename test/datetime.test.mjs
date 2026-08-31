import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/calculate.js';

test('evaluateLines converts unix timestamps to dates', () => {
  const { results } = evaluateLines(['fromunix(0)']);
  assert.equal(typeof results[0].value, 'string');
  assert.match(results[0].value, /1970/);
});

test('evaluateLines renders a known timestamp in UTC', () => {
  const { results } = evaluateLines(['fromunix(1446587186)']);
  assert.match(results[0].value, /Nov 3, 2015/);
});

test('evaluateLines exposes the current unix time', () => {
  const { results } = evaluateLines(['unix()']);
  assert.equal(typeof results[0].value, 'number');
  assert.ok(Math.abs(results[0].value - Date.now() / 1000) < 10);
});

test('evaluateLines computes date unit arithmetic', () => {
  const { results } = evaluateLines(['1 month in days', '1 year in days']);
  assert.equal(results[0].value.toNumeric('days'), 30.4375);
  assert.equal(results[1].value.toNumeric('days'), 365.25);
});
