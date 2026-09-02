import { evaluateLines, sampleFunction, registerCurrencyRates } from './core/calculate.js';
import formatResult from './render/formatResult.js';
import sparkline from './render/sparkline.js';

// The sparkline has to be built HERE, from the real numeric array: by the time
// a result reaches the main thread it is already a formatted string.
function sparkOf(result) {
  if (result.type === 'error' || result.value === undefined) return undefined;
  const value = result.value;
  const items = Array.isArray(value)
    ? value
    : value && value.isMatrix && typeof value.toArray === 'function'
      ? value.toArray()
      : null;
  if (!items) return undefined;
  return sparkline(items) || undefined;
}

self.addEventListener('message', (event) => {
  const { id, type, lines, data, name, from, to, samples } = event.data || {};
  if (type === 'evaluate') {
    try {
      const { results, total, startLine } = evaluateLines(lines);
      // Values are pre-formatted to strings so no mathjs class instances
      // (units, big numbers) cross the structured-clone boundary.
      const serialized = results.map((result) => ({
        type: result.type,
        value:
          result.value === undefined
            ? undefined
            : result.type === 'error'
              ? result.value
              : formatResult(result.value),
        spark: sparkOf(result),
        // Plain { name, arity }: the function itself never leaves the worker.
        fn: result.fn,
      }));
      self.postMessage({ id, type: 'result', results: serialized, total, startLine });
    } catch (error) {
      self.postMessage({ id, type: 'error', message: error.message });
    }
  } else if (type === 'plot') {
    // Functions cannot cross the clone boundary, so sampling happens here and
    // only the resulting [x, y] numbers are posted back.
    try {
      const { points, skipped, reason } = sampleFunction(lines, name, from, to, samples);
      self.postMessage({ id, type: 'plot', points, skipped, reason });
    } catch (error) {
      self.postMessage({ id, type: 'error', message: error.message });
    }
  } else if (type === 'rates') {
    registerCurrencyRates(data);
  }
});
