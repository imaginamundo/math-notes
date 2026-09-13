import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CLOCK_FORMAT,
  normalizeClockFormat,
  getClockFormat,
  setClockFormat,
} from '../js/core/clockFormat.js';

test('normalizeClockFormat accepts 24 and 12 and defaults otherwise', () => {
  assert.equal(DEFAULT_CLOCK_FORMAT, '24');
  assert.equal(normalizeClockFormat(undefined), '24');
  assert.equal(normalizeClockFormat(''), '24');
  assert.equal(normalizeClockFormat('12'), '12');
  assert.equal(normalizeClockFormat('24'), '24');
  assert.equal(normalizeClockFormat('13'), '24');
  assert.equal(normalizeClockFormat('nonsense'), '24');
});

test('setClockFormat updates the format the engines read', () => {
  const original = getClockFormat();
  try {
    setClockFormat('12');
    assert.equal(getClockFormat(), '12');
    setClockFormat('bogus');
    assert.equal(getClockFormat(), '24');
  } finally {
    setClockFormat(original);
  }
});
