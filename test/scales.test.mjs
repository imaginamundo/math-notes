import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/core/calculate.js';
import { preprocessScales } from '../js/eval/scales.js';

function valueOf(line) {
  return evaluateLines([line]).results[0].value;
}

test('preprocessScales expands scale suffixes', () => {
  assert.equal(preprocessScales('2k'), '2000');
  assert.equal(preprocessScales('1.5k'), '1500');
  assert.equal(preprocessScales('2M'), '2000000');
  assert.equal(preprocessScales('5 thousand'), '5000');
  assert.equal(preprocessScales('3 million'), '3000000');
  assert.equal(preprocessScales('2 billion'), '2000000000');
});

test('preprocessScales leaves units and letters attached', () => {
  assert.equal(preprocessScales('2km'), '2km');
  assert.equal(preprocessScales('2 kg'), '2 kg');
  assert.equal(preprocessScales('2 m'), '2 m');
  assert.equal(preprocessScales('2K'), '2K');
  assert.equal(preprocessScales('1Mbytes'), '1Mbytes');
});

test('evaluateLines resolves scales in expressions', () => {
  assert.equal(valueOf('2k'), 2000);
  assert.equal(valueOf('1.5k + 500'), 2000);
  assert.equal(valueOf('2M + 1'), 2000001);
});
