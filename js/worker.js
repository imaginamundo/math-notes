import {
  evaluateLines,
  registerCurrencyRates,
  registerMeasurementSystem,
  registerTotalMode,
} from './core/calculate.js';
import { DEFAULT_PRECISION, normalizeDecimalPrecision } from './core/decimalPrecision.js';
import { DEFAULT_CLOCK_FORMAT } from './core/clockFormat.js';
import { MSG, SETTING, PROTOCOL_VERSION } from './protocol.js';
import formatResult, { serializeResults } from './render/formatResult.js';
import { applyLinePatch } from './util/sequence.js';

let precision = DEFAULT_PRECISION;
let clockFormat = DEFAULT_CLOCK_FORMAT;
// The full sheet, reconstructed from the suffix patches the client sends.
let sheetLines = [];

// Every non-display setting arrives as one `{ type: 'setting', name, value }`
// message and is routed here, so adding one is a single entry rather than a new
// message type on both sides.
const SETTINGS = {
  [SETTING.rates]: (value) => registerCurrencyRates(value),
  [SETTING.measurement]: (value) => registerMeasurementSystem(value),
  [SETTING.totalMode]: (value) => registerTotalMode(value),
  [SETTING.precision]: (value) => {
    precision = normalizeDecimalPrecision(value);
  },
  [SETTING.clockFormat]: (value) => {
    clockFormat = value;
  },
};

self.addEventListener('message', (event) => {
  const { id, type, lines, from, name, value } = event.data || {};
  try {
    if (type === MSG.evaluate) {
      sheetLines = applyLinePatch(sheetLines, from, lines);
      const { results, total, startLine } = evaluateLines(sheetLines);
      // Values are pre-formatted to strings so no mathjs class instances
      // (units, big numbers) cross the structured-clone boundary.
      const serialized = serializeResults(results, precision, clockFormat);
      // The total may be a Unit (same-unit sheet) and must be serialized too.
      const serializedTotal =
        total === null || total === undefined ? total : formatResult(total, precision, clockFormat);
      self.postMessage({
        id,
        type: MSG.result,
        results: serialized,
        total: serializedTotal,
        startLine,
      });
    } else if (type === MSG.setting) {
      const apply = SETTINGS[name];
      if (apply) apply(value);
    }
  } catch (error) {
    // Only an evaluate request carries an id to report against. A malformed
    // settings payload must not take the worker down for the whole session.
    if (type === MSG.evaluate) {
      self.postMessage({ id, type: MSG.error, message: error.message });
    } else {
      console.error('worker message failed:', error, event.data);
    }
  }
});

// Say so once the bundle has loaded and the handler is installed, so the client times an
// evaluation from here and not from the start of the download.
self.postMessage({ type: MSG.ready, protocol: PROTOCOL_VERSION });
