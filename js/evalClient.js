import { fetchRates, loadCached } from './eval/currency.js';
import debounce from './util/debounce.js';

const EVALUATE_TIMEOUT = 10000;
const UPDATE_DELAY = 50;

/**
 * Client for the evaluation worker. Owns the worker connection, the
 * request/reply protocol (with timeout and render gating), the debounced
 * update scheduling, and forwarding currency rates to the worker.
 *
 * @param {HTMLTextAreaElement} editableNode  Source of the current sheet text.
 * @param {(lines: string[], data: SheetResult) => void} onRender  Renders the result.
 */
export function createEvalClient(editableNode, onRender) {
  let worker = null;
  let latestId = 0;
  let latestRenderId = 0;
  const pending = new Map();
  let fallbackModule = null;

  if (typeof Worker !== 'undefined') {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event) => {
      const callback = pending.get(event.data.id);
      if (!callback) return;
      pending.delete(event.data.id);
      callback(event.data);
    });
    const cachedRates = loadCached();
    if (cachedRates) worker.postMessage({ type: 'rates', data: cachedRates });
  }

  /**
   * Evaluate lines via the worker, or the lazy main-thread fallback when
   * workers are unavailable. Resolves with the payload and a correlation id.
   * @param {string[]} lines
   * @returns {Promise<{ id: number, data: SheetResult }>}
   */
  function requestEvaluate(lines) {
    if (worker) {
      return new Promise((resolve, reject) => {
        const id = ++latestId;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error('Evaluation timed out'));
        }, EVALUATE_TIMEOUT);
        pending.set(id, (data) => {
          clearTimeout(timer);
          if (data.type === 'error') reject(new Error(data.message));
          else resolve({ id, data });
        });
        worker.postMessage({ id, type: 'evaluate', lines });
      });
    }
    const load = fallbackModule
      ? Promise.resolve(fallbackModule)
      : import('./core/calculate.js').then((mod) => (fallbackModule = mod));
    return load.then((mod) => ({ id: 0, data: mod.evaluateLines(lines) }));
  }

  /**
   * Sample a single-argument function over a domain, for the plot modal.
   *
   * This must round-trip through the worker: user functions never cross the
   * structured-clone boundary, so the main thread cannot sample one itself.
   *
   * @param {string} name
   * @param {number} from
   * @param {number} to
   * @param {number} samples
   * @returns {Promise<{ points: Array<[number, number]>, skipped: number, reason: string|null }>}
   */
  function requestPlot(name, from, to, samples) {
    const lines = editableNode.value.split('\n');
    if (worker) {
      return new Promise((resolve, reject) => {
        const id = ++latestId;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error('Plotting timed out'));
        }, EVALUATE_TIMEOUT);
        pending.set(id, (data) => {
          clearTimeout(timer);
          if (data.type === 'error') reject(new Error(data.message));
          else resolve(data);
        });
        worker.postMessage({ id, type: 'plot', lines, name, from, to, samples });
      });
    }
    const load = fallbackModule
      ? Promise.resolve(fallbackModule)
      : import('./core/calculate.js').then((mod) => (fallbackModule = mod));
    return load.then((mod) => mod.sampleFunction(lines, name, from, to, samples));
  }

  /**
   * Evaluate lines and resolve with the result payload (no correlation id).
   * Used by the copy-current-line shortcut.
   * @param {string[]} lines
   * @returns {Promise<SheetResult>}
   */
  function requestLines(lines) {
    return requestEvaluate(lines).then(({ data }) => data);
  }

  // Evaluate the current sheet and render it, unless a newer update was
  // requested while this one was in flight.
  async function update() {
    const lines = editableNode.value.split('\n');
    const renderId = ++latestRenderId;
    try {
      const { data } = await requestEvaluate(lines);
      if (worker && renderId !== latestRenderId) return;
      onRender(lines, data);
    } catch (error) {
      console.error('Failed to update the sheet:', error);
    }
  }

  const debounced = debounce(update, UPDATE_DELAY);

  function syncRates(data) {
    if (worker && data) worker.postMessage({ type: 'rates', data });
  }

  fetchRates();

  return {
    update,
    requestLines,
    requestPlot,
    syncRates,
    schedule: debounced.schedule,
    flush: debounced.run,
  };
}

/** @typedef {import('./core/calculate.js').SheetResult} SheetResult */
