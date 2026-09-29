import {
  evaluateLines,
  registerCurrencyRates,
  registerMeasurementSystem,
  registerTotalMode,
} from './core/calculate.js';
import { DEFAULT_PRECISION, normalizeDecimalPrecision } from './core/decimalPrecision.js';
import { DEFAULT_CLOCK_FORMAT } from './core/clockFormat.js';
import formatResult from './render/formatResult.js';
import { applyLinePatch } from './util/sequence.js';

let precision = DEFAULT_PRECISION;
let clockFormat = DEFAULT_CLOCK_FORMAT;
// The full sheet, reconstructed from the suffix patches the client sends.
let sheetLines = [];

// Every non-display setting arrives as one `{ type: 'setting', name, value }`
// message and is routed here, so adding one is a single entry rather than a new
// message type on both sides.
const SETTINGS = {
  rates: (value) => registerCurrencyRates(value),
  measurement: (value) => registerMeasurementSystem(value),
  'total-mode': (value) => registerTotalMode(value),
  precision: (value) => {
    precision = normalizeDecimalPrecision(value);
  },
  'clock-format': (value) => {
    clockFormat = value;
  },
};

self.addEventListener('message', (event) => {
  const { id, type, lines, from, name, value } = event.data || {};
  try {
    if (type === 'evaluate') {
      sheetLines = applyLinePatch(sheetLines, from, lines);
      const { results, total, startLine } = evaluateLines(sheetLines);
      // Values are pre-formatted to strings so no mathjs class instances
      // (units, big numbers) cross the structured-clone boundary.
      const serialized = results.map((result) => ({
        type: result.type,
        value:
          result.value === undefined
            ? undefined
            : result.type === 'error'
              ? result.value
              : formatResult(result.value, precision, clockFormat),
        group: result.group,
      }));
      // The total may be a Unit (same-unit sheet) and must be serialized too.
      const serializedTotal =
        total === null || total === undefined ? total : formatResult(total, precision, clockFormat);
      self.postMessage({
        id,
        type: 'result',
        results: serialized,
        total: serializedTotal,
        startLine,
      });
    } else if (type === 'setting') {
      const apply = SETTINGS[name];
      if (apply) apply(value);
    }
  } catch (error) {
    // Only an evaluate request carries an id to report against. A malformed
    // settings payload must not take the worker down for the whole session.
    if (type === 'evaluate') {
      self.postMessage({ id, type: 'error', message: error.message });
    } else {
      console.error('worker message failed:', error, event.data);
    }
  }
});
