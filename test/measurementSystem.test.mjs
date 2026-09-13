import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMeasurementSystem } from '../js/core/measurementSystem.js';
import { MEASUREMENT_SYSTEMS, DEFAULT_MEASUREMENT_SYSTEM } from '../js/core/measures.js';

test('normalizeMeasurementSystem keeps known systems and defaults otherwise', () => {
  assert.equal(DEFAULT_MEASUREMENT_SYSTEM, 'metric');
  for (const system of MEASUREMENT_SYSTEMS) {
    assert.equal(normalizeMeasurementSystem(system), system);
  }
  assert.equal(normalizeMeasurementSystem(undefined), 'metric');
  assert.equal(normalizeMeasurementSystem(''), 'metric');
  assert.equal(normalizeMeasurementSystem('nonsense'), 'metric');
});
