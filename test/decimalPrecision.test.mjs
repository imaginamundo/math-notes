import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PRECISION,
  MIN_PRECISION,
  MAX_PRECISION,
  normalizeDecimalPrecision,
  getDecimalPrecision,
  setDecimalPrecision,
} from '../js/core/decimalPrecision.js';

test('decimal precision defaults to 3 and clamps to 0..10', () => {
  assert.equal(DEFAULT_PRECISION, 3);
  assert.equal(normalizeDecimalPrecision(undefined), DEFAULT_PRECISION);
  assert.equal(normalizeDecimalPrecision(''), DEFAULT_PRECISION);
  assert.equal(normalizeDecimalPrecision('abc'), DEFAULT_PRECISION);
  assert.equal(normalizeDecimalPrecision('5'), 5);
  assert.equal(normalizeDecimalPrecision(4.6), 5);
  assert.equal(normalizeDecimalPrecision(-2), MIN_PRECISION);
  assert.equal(normalizeDecimalPrecision(99), MAX_PRECISION);
});

test('the in-memory precision tracks setDecimalPrecision', () => {
  const original = getDecimalPrecision();
  try {
    setDecimalPrecision(7);
    assert.equal(getDecimalPrecision(), 7);
    setDecimalPrecision('bogus');
    assert.equal(getDecimalPrecision(), DEFAULT_PRECISION);
  } finally {
    setDecimalPrecision(original);
  }
});
