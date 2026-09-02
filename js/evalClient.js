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
 * @param {(busy: boolean) => void} [onBusy]  Notified while an evaluation is in flight.
 */
export function createEvalClient(editableNode, onRender, onBusy) {
  let worker = null;
  let latestId = 0;
  const pending = new Map();
  let fallbackModule = null;
  let pendingUpdates = 0;
  let busy = false;

  function setBusy(value) {
    if (busy === value) return;
    busy = value;
    if (onBusy) onBusy(value);
  }

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
   * Evaluate lines and resolve with the result payload (no correlation id).
   * Used by the copy-current-line shortcut.
   * @param {string[]} lines
   * @returns {Promise<SheetResult>}
   */
  function requestLines(lines) {
    return requestEvaluate(lines).then(({ data }) => data);
  }

  // Evaluate the current sheet and render it, unless the text changed while
  // this request was in flight (a newer edit superseded it). A reply is judged
  // stale by comparing against the current text — not by request order — so two
  // back-to-back requests for the same sheet cannot both be dropped: the first
  // one to resolve advances the worker's diff cache and renders, and if we had
  // skipped it by sequence number alone, the second would come back as "no
  // change" (startLine -1) and nothing would ever render.
  async function update() {
    pendingUpdates++;
    if (pendingUpdates === 1) setBusy(true);
    const text = editableNode.value;
    const lines = text.split('\n');
    try {
      const { data } = await requestEvaluate(lines);
      if (editableNode.value !== text) return;
      onRender(lines, data);
    } catch (error) {
      console.error('Failed to update the sheet:', error);
    } finally {
      pendingUpdates--;
      if (pendingUpdates === 0) setBusy(false);
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
    syncRates,
    schedule: debounced.schedule,
    flush: debounced.run,
  };
}

/** @typedef {import('./core/calculate.js').SheetResult} SheetResult */
