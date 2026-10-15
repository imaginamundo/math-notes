import { loadCached } from './storage/currencyRates.js';
import { createEvalGuard } from './storage/evalGuard.js';
import { MSG, SETTING } from './protocol.js';
import { readMeasurementSystem } from './core/measurementSystem.js';
import { DEFAULT_MEASUREMENT_SYSTEM } from './core/measures.js';
import { DEFAULT_PRECISION, readDecimalPrecision } from './core/decimalPrecision.js';
import { DEFAULT_CLOCK_FORMAT, readClockFormat } from './core/clockFormat.js';
import { DEFAULT_TOTAL_MODE, readTotalMode } from './core/totalMode.js';
import debounce from './util/debounce.js';
import { sheetLines } from './util/text.js';
import { firstDifference } from './util/sequence.js';

const EVALUATE_TIMEOUT = 10000;
const UPDATE_DELAY = 250;

/**
 * How to recover from a failed evaluation request. A pure function because the
 * alternative — waiting out the real timeout twice — is not a test anyone can
 * run.
 *
 *   'fallback'  The worker could not load or crashed, which is permanent for the
 *               session: the main thread owns evaluation from here on.
 *   'restart'   A timeout only means this worker is stuck. Terminate it and send
 *               the same request to a fresh one.
 *   'fail'      A second timeout for the same request. Give up on this reply
 *               instead of falling back: running the sheet on the main thread
 *               would block typing for at least as long as the worker already
 *               needed — exactly what the worker exists to avoid.
 *
 * @param {{ workerUnavailable: boolean, retried: boolean }} failure
 * @returns {'fallback'|'restart'|'fail'}
 */
export function recoveryFor({ workerUnavailable, retried }) {
  if (workerUnavailable) return 'fallback';
  if (retried) return 'fail';
  return 'restart';
}

/**
 * Client for the evaluation worker. Owns the worker connection, the
 * request/reply protocol (with timeout and render gating), the debounced
 * update scheduling, and forwarding currency rates to the worker.
 *
 * @param {HTMLTextAreaElement} editableNode  Source of the current sheet text.
 * @param {(lines: string[]) => void} onTextRender  Draws the typed input synchronously.
 * @param {(lines: string[], data: SheetResult) => void} onRender  Renders the results.
 * @param {(busy: boolean) => void} [onBusy]  Notified while an evaluation is in flight.
 * @param {(error: Error) => void} [onError]  Notified when a reply could not be produced.
 */
export function createEvalClient(editableNode, onTextRender, onRender, onBusy, onError) {
  // Remembers a sheet that was running when the page died, so it is not run again
  // on the next load (PRE-01).
  const guard = createEvalGuard();
  // A normal close during an evaluation is not a crash: clear the marker so the
  // sheet is not paused for nothing. A real crash never reaches this handler.
  if (typeof window !== 'undefined') window.addEventListener('pagehide', () => guard.end());
  // The last value of each setting (and the rates) this window was told. A worker
  // started after a restart, and the main-thread engine when it loads, are seeded
  // from these, not from localStorage: a restart is internal recovery and must not
  // change results because a storage write failed or another window changed a
  // setting (CORE-05).
  const applied = new Map();
  // Where the next rendered reply must start repainting at the latest, because a
  // reply the sheet had moved on from was dropped and its changed rows are still
  // on screen as they were (CORE-01).
  let droppedFrom = Infinity;
  let worker = null;
  let workerUnavailable = false;
  let latestId = 0;
  const pending = new Map();
  let fallbackModule = null;
  let pendingUpdates = 0;
  let busy = false;
  // The lines last handed to the worker, so a later evaluation can send only the
  // changed suffix (the worker keeps the full sheet and rebuilds from it).
  let lastSentLines = null;
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

  // The worker is created on the first evaluation rather than at import time,
  // so loading the page does not parse the mathjs bundle until it is needed.
  function startWorker() {
    let created;
    try {
      created = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    } catch {
      // Module workers are unsupported; use the main-thread evaluator.
      workerUnavailable = true;
      return null;
    }
    created.addEventListener('message', (event) => {
      const callback = pending.get(event.data.id);
      if (!callback) return;
      pending.delete(event.data.id);
      callback(event.data);
    });
    // If the worker crashes or its script fails to load, reject everything in
    // flight and fall back to the main-thread evaluator so the app degrades
    // gracefully instead of stalling on a 10s timeout per request.
    created.addEventListener('error', () => onWorkerError(created));
    // Seed the worker with the stored settings; the worker defaults to the same
    // values, so only a non-default choice needs sending.
    const seed = (name, value) => created.postMessage({ type: MSG.setting, name, value });
    // What this window was last told wins; storage is only the first answer.
    const initial = (name, read, defaultValue) => {
      if (applied.has(name)) return seed(name, applied.get(name));
      const value = read();
      if (value !== defaultValue) seed(name, value);
    };
    initial(SETTING.measurement, readMeasurementSystem, DEFAULT_MEASUREMENT_SYSTEM);
    initial(SETTING.precision, readDecimalPrecision, DEFAULT_PRECISION);
    initial(SETTING.totalMode, readTotalMode, DEFAULT_TOTAL_MODE);
    initial(SETTING.clockFormat, readClockFormat, DEFAULT_CLOCK_FORMAT);
    const rates = applied.has(SETTING.rates) ? applied.get(SETTING.rates) : loadCached();
    if (rates) seed(SETTING.rates, rates);
    // A fresh worker holds no sheet, so the next request must be a full one.
    lastSentLines = null;
    return created;
  }

  function ensureWorker() {
    if (!worker && !workerUnavailable && typeof Worker !== 'undefined') worker = startWorker();
    return worker;
  }

  // A first failure may be one dropped download or one crash, so the worker is started
  // again once; a second failure means it cannot run here, and the main thread takes over
  // for the rest of the session.
  let workerFailures = 0;
  function onWorkerError(failed) {
    if (failed !== worker) return;
    workerFailures++;
    if (workerFailures < 2) restartWorker('The evaluation worker failed');
    else dropWorker();
  }

  // The worker could not load, or it crashed: use the main-thread evaluator for
  // the rest of the session.
  function dropWorker() {
    if (!worker) return;
    workerUnavailable = true;
    worker.terminate();
    worker = null;
    for (const [id, callback] of pending) {
      pending.delete(id);
      callback({ type: MSG.error, message: 'The evaluation worker failed' });
    }
  }

  // A request timed out (or the worker failed mid-request): drop it so the next
  // update starts a fresh worker, but do not give up on the worker for the whole
  // session. A single slow sheet must not move every later keystroke onto the
  // main thread.
  function restartWorker(reason = 'The evaluation worker timed out') {
    if (!worker) return;
    const failed = worker;
    worker = null;
    failed.terminate();
    for (const [id, callback] of pending) {
      pending.delete(id);
      callback({ type: MSG.error, message: reason });
    }
    lastSentLines = null;
  }

  /**
   * Evaluate lines via the worker, or the lazy main-thread fallback when
   * workers are unavailable. Resolves with the payload and a correlation id.
   * @param {string[]} lines
   * @param {boolean} [retried]  Set for the one retry after a worker restart.
   * @returns {Promise<{ id: number, data: SheetResult }>}
   */
  function requestEvaluate(lines, retried = false) {
    const active = ensureWorker();
    if (!active) return fallbackEvaluate(lines);
    return workerEvaluate(active, lines).catch(() => {
      const action = recoveryFor({ workerUnavailable, retried });
      if (action === 'fallback') return fallbackEvaluate(lines);
      if (worker === active) restartWorker();
      if (action === 'fail') return Promise.reject(new Error('Evaluation timed out twice'));
      return requestEvaluate(lines, true);
    });
  }

  // A failed dynamic import is remembered by the browser for that exact URL, so a later
  // attempt (after the network is back) asks for a different one.
  let importAttempts = 0;
  function importCalculate() {
    const attempt = importAttempts++;
    return import(attempt === 0 ? './core/calculate.js' : `./core/calculate.js?retry=${attempt}`);
  }

  // Evaluate on the main thread when there is no worker or it failed. The raw
  // values this resolves with are formatted by `patchResults`, which accepts
  // both the worker's pre-formatted strings and these numbers/units. This path
  // is synchronous, so the timeout here only bounds the module import; it can
  // never interrupt the evaluation itself.
  function fallbackEvaluate(lines) {
    const load = fallbackModule
      ? Promise.resolve(fallbackModule)
      : importCalculate().then((mod) => {
          fallbackModule = mod;
          // The engine takes rates as input; the composition root owns the
          // cache, so seed the freshly loaded module with what this window was
          // last told, else with what is stored, and replay the settings it was
          // sent before it existed.
          const rates = applied.has(SETTING.rates) ? applied.get(SETTING.rates) : loadCached();
          if (rates) mod.registerCurrencyRates(rates);
          for (const [name, value] of applied) {
            if (name !== SETTING.rates && FALLBACK_SETTINGS[name]) {
              applyToFallback((module) => FALLBACK_SETTINGS[name](module, value));
            }
          }
          return mod;
        });
    return withTimeout(
      load.then((mod) => ({ id: 0, data: mod.evaluateLines(lines) })),
      EVALUATE_TIMEOUT
    );
  }

  function workerEvaluate(worker, lines) {
    return new Promise((resolve, reject) => {
      const id = ++latestId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Evaluation timed out'));
      }, EVALUATE_TIMEOUT);
      pending.set(id, (data) => {
        clearTimeout(timer);
        if (data.type === MSG.error) reject(new Error(data.message));
        else resolve({ id, data });
      });
      // Send only the suffix from the first changed line. `from` is -1 when
      // nothing changed, in which case the worker rebuilds the same sheet.
      const from = lastSentLines ? firstDifference(lastSentLines, lines) : 0;
      const suffix = from > 0 ? lines.slice(from) : from === 0 ? lines : [];
      worker.postMessage({
        id,
        type: MSG.evaluate,
        lines: suffix,
        from: from === -1 ? lines.length : from,
      });
      lastSentLines = lines;
    });
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
    const text = editableNode.value;
    const lines = sheetLines(text);
    // This exact sheet stopped the app last time it was calculated. Draw what was
    // typed, blank any results left from another sheet, and say why there are none.
    if (guard.isPaused(text)) {
      if (onTextRender) onTextRender(lines);
      onRender(lines, { results: [], total: null, startLine: 0 });
      if (onError) onError(Object.assign(new Error('Evaluation is paused'), { code: 'paused' }));
      return;
    }
    pendingUpdates++;
    if (pendingUpdates === 1) setBusy(true);
    guard.begin(text);
    // A display-option change only reformats results, so the engine reports "no
    // change" (startLine -1). Snapshot the dirty flags for THIS request and clear
    // them immediately: a stale in-flight reply must not consume a force that
    // belongs to the request issued after the change.
    const forcePrecision = precisionDirty;
    const forceClock = clockFormatDirty;
    const forceRender = forcePrecision || forceClock;
    precisionDirty = false;
    clockFormatDirty = false;
    try {
      // Draw the input first so a slow sheet never hides what you just typed;
      // the results fill in when the reply lands (or not at all if stale).
      if (onTextRender) onTextRender(lines);
      const { data } = await requestEvaluate(lines);
      if (editableNode.value !== text) {
        // The forced redraw was superseded by a newer edit; re-arm it so the
        // next request still repaints with the new setting (a later edit is not
        // guaranteed to change enough for the engine to report a full render).
        if (forcePrecision) precisionDirty = true;
        if (forceClock) clockFormatDirty = true;
        // The engine's cache has already advanced past this reply, so the next
        // reply only covers what changed since. Remember how far back this one
        // reached, or rows above the next edit (a group subtotal, a conversion)
        // are never repainted.
        if (data.startLine >= 0) droppedFrom = Math.min(droppedFrom, data.startLine);
        return;
      }
      if (droppedFrom !== Infinity) {
        data.startLine = data.startLine < 0 ? droppedFrom : Math.min(data.startLine, droppedFrom);
        droppedFrom = Infinity;
      }
      if (forceRender) data.startLine = 0;
      onRender(lines, data);
    } catch (error) {
      console.error('Failed to update the sheet:', error);
      // The results are now stale and nothing on screen says so; tell the UI.
      if (onError) onError(error);
    } finally {
      pendingUpdates--;
      if (pendingUpdates === 0) {
        setBusy(false);
        guard.end();
      }
    }
  }

  const debounced = debounce(update, UPDATE_DELAY);

  // The main-thread engine is created lazily by the fallback path, so apply a
  // setting to it directly when it exists. A freshly created engine reads the
  // stored measurement system itself and is seeded with the cached rates when
  // the fallback first loads it, so anything changed before then is already
  // picked up.
  function applyToFallback(apply) {
    if (!fallbackModule) return;
    try {
      apply(fallbackModule);
    } catch {
      // a setting that cannot be applied must not break evaluation
    }
  }

  // Settings the main-thread engine also owns; precision and clock format are
  // module-level state the UI sets directly, so only the worker needs them.
  const FALLBACK_SETTINGS = {
    [SETTING.rates]: (mod, value) => mod.registerCurrencyRates(value),
    [SETTING.measurement]: (mod, value) => mod.registerMeasurementSystem(value),
    [SETTING.totalMode]: (mod, value) => mod.registerTotalMode(value),
  };

  // Every setting is sent as one message shape; the worker routes by name.
  function postSetting(name, value) {
    if (value !== undefined) applied.set(name, value);
    if (worker && value !== undefined) worker.postMessage({ type: MSG.setting, name, value });
    const apply = FALLBACK_SETTINGS[name];
    if (apply) applyToFallback((mod) => apply(mod, value));
  }

  function syncRates(data) {
    if (data) postSetting(SETTING.rates, data);
  }

  function syncMeasurement(system) {
    if (system) postSetting(SETTING.measurement, system);
  }

  function syncPrecision(value) {
    if (value !== undefined) postSetting(SETTING.precision, value);
    precisionDirty = true;
  }

  function syncTotalMode(mode) {
    if (mode) postSetting(SETTING.totalMode, mode);
  }

  function syncClockFormat(format) {
    if (format) postSetting(SETTING.clockFormat, format);
    clockFormatDirty = true;
  }

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
