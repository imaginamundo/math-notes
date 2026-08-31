import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/core/calculate.js';
import { preprocessPercent } from '../js/eval/percentage.js';

function valueOf(line) {
  return evaluateLines([line]).results[0].value;
}

test('preprocessPercent rewrites percentage value phrases', () => {
  assert.equal(preprocessPercent('20% of 10'), '(10) * 20%');
  assert.equal(preprocessPercent('5% on 30'), '(30) + 5%');
  assert.equal(preprocessPercent('6% off 40'), '(40) - 6%');
});

test('preprocessPercent rewrites relative percentage phrases', () => {
  assert.equal(preprocessPercent('50 as a % of 100'), '((50) / (100)) * 100');
  assert.equal(preprocessPercent('70 as a % on 20'), '((70) / (20) - 1) * 100');
  assert.equal(preprocessPercent('20 as a % off 70'), '(1 - (20) / (70)) * 100');
});

test('preprocessPercent rewrites value by percent part phrases', () => {
  assert.equal(preprocessPercent('5% of what is 6'), '(6) / 5%');
  assert.equal(preprocessPercent('5% on what is 6'), '(6) / (1 + 5%)');
  assert.equal(preprocessPercent('5% off what is 6'), '(6) / (1 - 5%)');
});

test('preprocessPercent leaves modulo and plain percent alone', () => {
  assert.equal(preprocessPercent('10 % 3'), '10 % 3');
  assert.equal(preprocessPercent('10 - 40%'), '10 - 40%');
  assert.equal(preprocessPercent('40%'), '40%');
});

test('evaluateLines evaluates percentage phrases', () => {
  assert.equal(valueOf('20% of 10'), 2);
  assert.equal(valueOf('5% on 30'), 31.5);
  assert.equal(valueOf('6% off 40'), 37.6);
  assert.equal(valueOf('50 as a % of 100'), 50);
  assert.equal(valueOf('5% of what is 6'), 120);
  assert.ok(Math.abs(valueOf('5% on what is 6') - 6 / 1.05) < 1e-9);
  assert.ok(Math.abs(valueOf('5% off what is 6') - 6 / 0.95) < 1e-9);
});

test('evaluateLines keeps precedence with compound operands', () => {
  assert.equal(valueOf('20% of 10 + 5'), 3);
  assert.equal(valueOf('10 + 20 as a % of 50'), 60);
  assert.equal(valueOf('10 + 70 as a % on 20'), 300);
  assert.equal(valueOf('5% on 30 + 10'), 42);
  assert.equal(valueOf('4 + 2 as a % off 20'), 70);
});
