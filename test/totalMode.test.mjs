import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import { DEFAULT_TOTAL_MODE, normalizeTotalMode } from '../js/core/totalMode.js';

test('normalizeTotalMode defaults to sum', () => {
  assert.equal(DEFAULT_TOTAL_MODE, 'sum');
  assert.equal(normalizeTotalMode(undefined), 'sum');
  assert.equal(normalizeTotalMode('median'), 'median');
  assert.equal(normalizeTotalMode('average'), 'average');
  assert.equal(normalizeTotalMode('nonsense'), 'sum');
});

function totalOf(mode, lines) {
  const engine = createEngine();
  engine.registerTotalMode(mode);
  return engine.evaluateLines(lines).total;
}

test('the total mode picks the aggregate', () => {
  assert.equal(totalOf('sum', ['10', '20', '30']), 60);
  assert.equal(totalOf('average', ['10', '20', '30']), 20);
  assert.equal(totalOf('median', ['10', '20', '30']), 20);
  assert.equal(totalOf('median', ['10', '20', '30', '40']), 25);
  assert.equal(totalOf('median', ['5', '1', '3']), 3);
});

test('median respects units and folds plain numbers', () => {
  const unit = totalOf('median', ['10 km', '20 km', '30 km']);
  assert.equal(unit.formatUnits(), 'km');
  assert.equal(unit.toNumber(), 20);

  const mixed = totalOf('median', ['10 km', '5']);
  assert.equal(mixed.toNumber(), 7.5);
});
