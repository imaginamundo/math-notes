import { evaluateLines, registerCurrencyRates } from './core/calculate.js';
import formatResult from './render/formatResult.js';

self.addEventListener('message', (event) => {
  const { id, type, lines, data } = event.data || {};
  if (type === 'evaluate') {
    try {
      const { results, total, startLine, kinds } = evaluateLines(lines);
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
      }));
      // `kinds` is an array of plain strings, so it clones as-is.
      self.postMessage({ id, type: 'result', results: serialized, total, startLine, kinds });
    } catch (error) {
      self.postMessage({ id, type: 'error', message: error.message });
    }
  } else if (type === 'rates') {
    registerCurrencyRates(data);
  }
});
