import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readableUnit } from '../js/core/unitNames.js';

test('readableUnit singularises known time units', () => {
  assert.equal(readableUnit('days'), 'day');
  assert.equal(readableUnit('h'), 'hour');
  assert.equal(readableUnit('min'), 'minute');
  assert.equal(readableUnit('seconds'), 'second');
});

test('readableUnit leaves unknown names alone', () => {
  assert.equal(readableUnit('km'), 'km');
  assert.equal(readableUnit('USD'), 'USD');
});
