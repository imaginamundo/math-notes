import { fetchRates, loadCached } from './eval/currency.js';
import { readMeasurementSystem } from './core/measurementSystem.js';
import { DEFAULT_MEASUREMENT_SYSTEM } from './core/measures.js';
import { DEFAULT_PRECISION, readDecimalPrecision } from './core/decimalPrecision.js';
import { DEFAULT_CLOCK_FORMAT, readClockFormat } from './core/clockFormat.js';
import { DEFAULT_TOTAL_MODE, readTotalMode } from './core/totalMode.js';
import debounce from './util/debounce.js';

const EVALUATE_TIMEOUT = 10000;
const UPDATE_DELAY = 250;

/**
 * Client for the evaluation worker. Owns the worker connection, the
 * request/reply protocol (with timeout and render gating), the debounced
 * update scheduling, and forwarding currency rates to the worker.
 *
 * @param {HTMLTextAreaElement} editableNode  Source of the current sheet text.
 * @param {(lines: string[]) => void} onTextRender  Draws the typed input synchronously.
 * @param {(lines: string[], data: SheetResult) => void} onRender  Renders the results.
 * @param {(busy: boolean) => void} [onBusy]  Notified while an evaluation is in flight.
 */
export function createEvalClient(editableNode, onTextRender, onRender, onBusy) {
  let worker = null;
  let latestId = 0;
  const pending = new Map();
  let fallbackModule = null;
  let pendingUpdates = 0;
  let busy = false;
  // A precision change only reformats results, so the engine reports "no
  // change" (startLine -1). Force one full re-render so the new precision shows.
  let precisionDirty = false;
  // The clock format is the same: reformat only, so force a full re-render.
  let clockFormatDirty = false;

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
    // If the worker crashes or its script fails to load, reject everything in
    // flight and fall back to the main-thread evaluator so the app degrades
    // gracefully instead of stalling on a 10s timeout per request.
    worker.addEventListener('error', dropWorker);
    // Seed the worker with the stored measurement system; the worker defaults
    // to metric, so only a non-default choice needs sending.
    const measurementSystem = readMeasurementSystem();
    if (measurementSystem !== DEFAULT_MEASUREMENT_SYSTEM) {
      worker.postMessage({ type: 'measurement', data: measurementSystem });
    }
    const precision = readDecimalPrecision();
    if (precision !== DEFAULT_PRECISION) {
      worker.postMessage({ type: 'precision', data: precision });
    }
    const totalMode = readTotalMode();
    if (totalMode !== DEFAULT_TOTAL_MODE) {
      worker.postMessage({ type: 'total-mode', data: totalMode });
    }
    const clockFormat = readClockFormat();
    if (clockFormat !== DEFAULT_CLOCK_FORMAT) {
      worker.postMessage({ type: 'clock-format', data: clockFormat });
    }
    const cachedRates = loadCached();
    if (cachedRates) worker.postMessage({ type: 'rates', data: cachedRates });
  }

  function dropWorker() {
    if (!worker) return;
    worker.terminate();
    worker = null;
    for (const [id, callback] of pending) {
      pending.delete(id);
      callback({ type: 'error', message: 'The evaluation worker failed' });
    }
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
    return withTimeout(
      load.then((mod) => ({ id: 0, data: mod.evaluateLines(lines) })),
      EVALUATE_TIMEOUT
    );
  }

  // Reject when a promise does not settle in time (clears the timer so a late
  // settlement cannot reject a caller that already moved on).
  function withTimeout(promise, ms) {
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Evaluation timed out')), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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
      // Draw the input first so a slow sheet never hides what you just typed;
      // the results fill in when the reply lands (or not at all if stale).
      if (onTextRender) onTextRender(lines);
      const { data } = await requestEvaluate(lines);
      if (editableNode.value !== text) return;
      if (precisionDirty) {
        data.startLine = 0;
        precisionDirty = false;
      }
      if (clockFormatDirty) {
        data.startLine = 0;
        clockFormatDirty = false;
      }
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

  function syncMeasurement(system) {
    if (worker && system) worker.postMessage({ type: 'measurement', data: system });
  }

  function syncPrecision(value) {
    if (worker && value !== undefined) worker.postMessage({ type: 'precision', data: value });
    precisionDirty = true;
  }

  function syncTotalMode(mode) {
    if (worker && mode) worker.postMessage({ type: 'total-mode', data: mode });
  }

  function syncClockFormat(format) {
    if (worker && format) worker.postMessage({ type: 'clock-format', data: format });
    clockFormatDirty = true;
  }

  fetchRates();

  return {
    update,
    requestLines,
    syncRates,
    syncMeasurement,
    syncPrecision,
    syncTotalMode,
    syncClockFormat,
    schedule: debounced.schedule,
    flush: debounced.flush,
  };
}

/** @typedef {import('./core/calculate.js').SheetResult} SheetResult */
