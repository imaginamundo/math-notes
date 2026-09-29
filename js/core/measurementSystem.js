import defineSetting from './setting.js';
import { MEASUREMENT_SYSTEMS, DEFAULT_MEASUREMENT_SYSTEM } from './measures.js';

// The user's preferred system for cooking volume units. Metric is the default.
const setting = defineSetting({
  key: 'math-notes-measurement-system',
  values: MEASUREMENT_SYSTEMS,
  defaultValue: DEFAULT_MEASUREMENT_SYSTEM,
});

const STORAGE_KEY = setting.key;
const normalizeMeasurementSystem = setting.normalize;
const readMeasurementSystem = setting.read;
const writeMeasurementSystem = setting.write;

export { STORAGE_KEY, normalizeMeasurementSystem, readMeasurementSystem, writeMeasurementSystem };
