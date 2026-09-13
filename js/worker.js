import {
  evaluateLines,
  registerCurrencyRates,
  registerMeasurementSystem,
  registerTotalMode,
} from './core/calculate.js';
import { DEFAULT_PRECISION, normalizeDecimalPrecision } from './core/decimalPrecision.js';
import { setClockFormat } from './core/clockFormat.js';
import formatResult from './render/formatResult.js';
import { applyLinePatch } from './util/sequence.js';

let precision = DEFAULT_PRECISION;
// The full sheet, reconstructed from the suffix patches the client sends.
let sheetLines = [];

self.addEventListener('message', (event) => {
  const { id, type, lines, from, data } = event.data || {};
  if (type === 'evaluate') {
    try {
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
              : formatResult(result.value, precision),
        group: result.group,
      }));
      // The total may be a Unit (same-unit sheet) and must be serialized too.
      const serializedTotal =
        total === null || total === undefined ? total : formatResult(total, precision);
      self.postMessage({
        id,
        type: 'result',
        results: serialized,
        total: serializedTotal,
        startLine,
      });
    } catch (error) {
      self.postMessage({ id, type: 'error', message: error.message });
    }
  } else if (type === 'rates') {
    registerCurrencyRates(data);
  } else if (type === 'measurement') {
    registerMeasurementSystem(data);
  } else if (type === 'total-mode') {
    registerTotalMode(data);
  } else if (type === 'precision') {
    precision = normalizeDecimalPrecision(data);
  } else if (type === 'clock-format') {
    setClockFormat(data);
  }
});
