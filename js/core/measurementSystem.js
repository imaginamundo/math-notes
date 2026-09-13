import storage from '../util/storage.js';
import { MEASUREMENT_SYSTEMS, DEFAULT_MEASUREMENT_SYSTEM } from './measures.js';

// The user's preferred system for cooking volume units. Metric is the default.
const STORAGE_KEY = 'math-notes-measurement-system';

function normalizeMeasurementSystem(system) {
  return MEASUREMENT_SYSTEMS.includes(system) ? system : DEFAULT_MEASUREMENT_SYSTEM;
}

// Reads through the storage wrapper, so an unavailable localStorage (or the
// worker, which has none) falls back to the default.
function readMeasurementSystem() {
  return normalizeMeasurementSystem(storage.get(STORAGE_KEY));
}

function writeMeasurementSystem(system) {
  storage.set(STORAGE_KEY, normalizeMeasurementSystem(system));
}

export { STORAGE_KEY, normalizeMeasurementSystem, readMeasurementSystem, writeMeasurementSystem };
