import { evaluateLines, registerCurrencyRates } from './core/calculate.js';
import formatResult from './render/formatResult.js';

self.addEventListener('message', (event) => {
  const { id, type, lines, data } = event.data || {};
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
        group: result.group,
      }));
      // The total may be a Unit (same-unit sheet) and must be serialized too.
      const serializedTotal = total === null || total === undefined ? total : formatResult(total);
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
  }
});
