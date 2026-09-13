import { test } from 'node:test';
import assert from 'node:assert/strict';
import preprocess, { STEPS } from '../js/core/preprocess.js';

test('preprocess folds the documented steps in order', () => {
  assert.ok(STEPS.length > 0);
  for (const step of STEPS) assert.equal(typeof step, 'function');
  const value = '$2k + 20% of 10';
  assert.equal(
    preprocess(value),
    STEPS.reduce((result, step) => step(result), value)
  );
});

test('preprocess leaves plain arithmetic alone', () => {
  assert.equal(preprocess('1 + 1'), '1 + 1');
  assert.equal(preprocess('2 * 3 + 1'), '2 * 3 + 1');
});
