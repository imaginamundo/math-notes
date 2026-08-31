import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateLines } from '../js/core/calculate.js';
import { preprocessWordOps } from '../js/eval/wordOperators.js';

function valueOf(line) {
  return evaluateLines([line]).results[0].value;
}

test('preprocessWordOps converts word operators', () => {
  assert.equal(preprocessWordOps('8 times 9'), '8 * 9');
  assert.equal(preprocessWordOps('2 plus 3'), '2 + 3');
  assert.equal(preprocessWordOps('10 minus 3'), '10 - 3');
  assert.equal(preprocessWordOps('5 with 2'), '5 + 2');
  assert.equal(preprocessWordOps('10 without 3'), '10 - 3');
  assert.equal(preprocessWordOps('6 multiplied by 7'), '6 * 7');
  assert.equal(preprocessWordOps('20 divided by 4'), '20 / 4');
  assert.equal(preprocessWordOps('20 divide by 5'), '20 / 5');
  assert.equal(preprocessWordOps('8 mul 9'), '8 * 9');
});

test('preprocessWordOps leaves mathjs logical and alone', () => {
  assert.equal(preprocessWordOps('true and false'), 'true and false');
});

test('preprocessWordOps ignores words inside identifiers', () => {
  assert.equal(preprocessWordOps('command'), 'command');
  assert.equal(preprocessWordOps('within'), 'within');
  assert.equal(preprocessWordOps('dimensions'), 'dimensions');
});

test('evaluateLines evaluates word operators', () => {
  assert.equal(valueOf('8 times 9'), 72);
  assert.equal(valueOf('2 plus 3'), 5);
  assert.equal(valueOf('10 minus 3'), 7);
  assert.equal(valueOf('5 with 2'), 7);
  assert.equal(valueOf('6 multiplied by 7'), 42);
  assert.equal(valueOf('20 divided by 4'), 5);
});

test('evaluateLines keeps logical and working', () => {
  assert.equal(valueOf('true and false'), false);
  assert.equal(valueOf('true and true'), true);
});
