import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/calculate.js';

function valueOf(line) {
  return evaluateLines([line]).results[0].value;
}

test('cssUnits convert px to length', () => {
  const px = valueOf('1 cm in px');
  assert.ok(Math.abs(px.toNumeric('px') - 37.79527559055118) < 1e-9);
});

test('cssUnits convert em relative to px', () => {
  assert.ok(Math.abs(valueOf('2 em in px').toNumeric('px') - 32) < 1e-9);
  assert.ok(Math.abs(valueOf('16 px in em').toNumeric('em') - 1) < 1e-9);
});

test('cssUnits provide typography points', () => {
  const pt = valueOf('12 point in px');
  assert.ok(Math.abs(pt.toNumeric('px') - 16) < 1e-9);
});
