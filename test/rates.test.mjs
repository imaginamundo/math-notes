import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { preprocessRates } from '../js/eval/rates.js';

function valueOf(line) {
  return evaluateLines([line]).results[0].value;
}

function approx(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
}

test('preprocessRates rewrites rate phrasing', () => {
  assert.equal(preprocessRates('10 km per day'), '10 km / day');
  assert.equal(preprocessRates('24 km a day'), '24 km / day');
  assert.equal(preprocessRates('30 hours at 10 km/hour'), '__rate((30 hours), (10 km/hour))');
  assert.equal(preprocessRates('time to upload 3 GB at 10 MB/s'), '(3 GB) / (10 MB/s)');
  assert.equal(preprocessRates('5 km in 25 min'), '__pace((5 km), (25 minutes))');
  assert.equal(preprocessRates('24 km a day for a year'), '24 km / day * 1 year');
});

test('preprocessRates leaves ordinary expressions alone', () => {
  assert.equal(preprocessRates('1 cm to m'), '1 cm to m');
  assert.equal(preprocessRates('20% of 10'), '20% of 10');
  assert.equal(preprocessRates('2 + 2'), '2 + 2');
});

test('evaluateLines simplifies rates', () => {
  assert.equal(formatResult(valueOf('90 km / 3 day')), '30 km/day');
  assert.equal(formatResult(valueOf('10 km per day')), '10 km/day');
  assert.equal(formatResult(valueOf('24 km a day')), '24 km/day');
});

test('evaluateLines multiplies and divides by a rate with at', () => {
  approx(valueOf('30 hours at 10 km/hour').toNumber(), 300);
  assert.equal(valueOf('30 hours at 10 km/hour').formatUnits(), 'km');
  approx(valueOf('100 km at 10 km/hour').toNumber(), 10);
  assert.equal(valueOf('100 km at 10 km/hour').formatUnits(), 'hour');
});

test('evaluateLines computes transfer time', () => {
  assert.equal(formatResult(valueOf('time to upload 3 GB at 10 MB/s')), '300 s');
});

test('evaluateLines formats pace as mm:ss', () => {
  assert.equal(formatResult(valueOf('5 km in 25 min')), '05:00/km');
  assert.equal(formatResult(valueOf('10 mi in 55 min')), '05:30/mi');
});

test('evaluateLines multiplies a rate by a duration', () => {
  assert.equal(formatResult(valueOf('24 km a day for a year')), '8,766 km');
});
