import { createRowRenderer } from './render/renderInput.js';
import renderTotal from './render/renderTotal.js';
import { indexOfLineAt, sheetLines } from './util/text.js';
import registerServiceWorker from './registerServiceWorker.js';
import { createEvalClient } from './evalClient.js';
import { fetchRates, startRateRefresh } from './storage/currencyRates.js';
import initRecipes from './ui/recipes.js';
import initDocsLink from './ui/docsLink.js';
import initSettings from './ui/settings.js';
import initFontControls from './ui/cosmetic.js';
import initTabs from './ui/tabs.js';
import initOnboarding, { readOnboardingState } from './ui/onboarding.js';
import initShare from './ui/share.js';
import initIo from './ui/io.js';
import initShortcuts from './ui/shortcuts.js';
import initFind from './ui/find.js';
import initLineNumbers from './ui/lineNumbers.js';
import initGoToLine from './ui/goToLine.js';
import initIndent from './ui/indent.js';
import initAutocomplete from './ui/autocomplete.js';
import initStarterPrompt from './ui/starterPrompt.js';
import initTotalMode from './ui/totalModeControl.js';
import initLoadingIndicator from './ui/loading.js';
import initEditorScroll from './ui/editor.js';
import { readClockFormat, setClockFormat } from './core/clockFormat.js';
import { readDecimalPrecision, setDecimalPrecision } from './core/decimalPrecision.js';
import { initI18n, t } from './i18n/index.js';
import {
  CURRENCY_UPDATED,
  CURRENCY_ERROR,
  MEASUREMENT_UPDATED,
  PRECISION_UPDATED,
  TOTAL_MODE_UPDATED,
  CLOCK_FORMAT_UPDATED,
  STORAGE_ERROR,
  STORAGE_OK,
  STATUS_MESSAGE,
  FONT_SIZE_CHANGED,
} from './util/events.js';

const contentEditableNode = document.getElementById('content-editable');
const viewNode = document.getElementById('view');
const totalNode = document.getElementById('total');
const currencyStatusNode = document.getElementById('currency-status');
const loadingIndicator = initLoadingIndicator(document.getElementById('loading'));

// Evaluation runs in a Web Worker owned by the eval client, which debounces
// updates, gates stale renders, and forwards currency rates. Text is rendered
// synchronously on the main thread (phase one) so typing never waits on the
// worker; only the results and total come back asynchronously (phase two).
const editorScroll = initEditorScroll(contentEditableNode);
const rowRenderer = createRowRenderer(viewNode);
// The main thread formats some values too (line references, copied results), so
// it needs the clock format alongside the worker.
setClockFormat(readClockFormat());
setDecimalPrecision(readDecimalPrecision());

function renderTextLayer(lines) {
  rowRenderer.renderText(lines);
  editorScroll.syncSize();
}

// The line under the caret drives error expansion (see rowRenderer).
function activeLine() {
  return indexOfLineAt(contentEditableNode.value, contentEditableNode.selectionStart);
}

// A held notice is one that must stay up until its cause is gone, and that rate
// messages arriving later must not replace: 'paused' (the active sheet stopped the
// app last time), 'storage' (saving is failing) and 'recovered' (work was restored
// from the backup). Each has its own way to end; see `release`.
let held = null;

function renderResultLayer(lines, data) {
  if (held === 'paused' && data.results.length > 0) release('paused');
  rowRenderer.patchResults(lines, data.results, data.startLine);
  renderTotal(totalNode, data.total);
  rowRenderer.updateActiveLine(activeLine());
  editorScroll.syncSize();
}

const evalClient = createEvalClient(
  contentEditableNode,
  renderTextLayer,
  renderResultLayer,
  (busy) => (busy ? loadingIndicator.show() : loadingIndicator.hide()),
  // Nothing renders when a reply never arrives, so say so rather than leaving
  // results that look current but are not.
  // A sheet that stopped the app last time is paused, not failed.
  (error) =>
    error && error.code === 'paused'
      ? showPausedStatus()
      : showCurrencyStatus(t('status.evaluationFailed'))
);

// Trigger changes: redraw what you typed immediately, then evaluate in the
// worker on a debounce and fill the results in when it replies.
contentEditableNode.addEventListener('input', (event) => {
  renderTextLayer(sheetLines(contentEditableNode.value));
  rowRenderer.updateActiveLine(activeLine());
  // A programmatic write (tab switch, undo/redo, seed) is evaluated immediately
  // by the tab controller, so only a user edit needs the debounced schedule.
  if (!event.programmatic) {
    evalClient.schedule();
    release('recovered');
  }
});
contentEditableNode.addEventListener('click', () => rowRenderer.updateActiveLine(activeLine()));
contentEditableNode.addEventListener('keyup', () => rowRenderer.updateActiveLine(activeLine()));

// Status and reactivity are wired before boot(): the inits inside it notify
// synchronously (a quota hit while the collection persists, a font size
// restored at startup), and a listener registered afterwards would drop that
// first message.
let statusTimer = null;
// `sticky` keeps the notice up until the next one: a boot failure is not
// something the reader should have to catch within five seconds.
function showCurrencyStatus(text, sticky = false) {
  currencyStatusNode.textContent = text;
  currencyStatusNode.classList.add('visible');
  clearTimeout(statusTimer);
  if (sticky) return;
  statusTimer = setTimeout(() => currencyStatusNode.classList.remove('visible'), 5000);
}

function hold(kind, text) {
  held = kind;
  showCurrencyStatus(text, true);
}

function release(kind) {
  if (held !== kind) return;
  held = null;
  currencyStatusNode.classList.remove('visible');
}

function showPausedStatus() {
  hold('paused', t('status.evaluationPaused'));
}

// Rate notices are background news; they wait while a held notice is up.
function showRateStatus(key) {
  if (!held) showCurrencyStatus(t(key));
}

window.addEventListener(CURRENCY_UPDATED, (event) => {
  release('rates');
  evalClient.syncRates(event.detail && event.detail.data);
  evalClient.update();
  const source = event.detail && event.detail.source;
  const key =
    source === 'cached'
      ? 'status.ratesCached'
      : source === 'stale'
        ? 'status.ratesStale'
        : 'status.ratesLive';
  showRateStatus(key);
});

window.addEventListener(CURRENCY_ERROR, () => {
  evalClient.update();
  // Currency lines cannot be worked out until rates arrive, so the notice stays up till then
  // (unless a more urgent held notice is showing).
  if (!held) hold('rates', t('status.ratesUnavailable'));
});

// A failed localStorage write (usually the quota is full) must not be silent.
// It stays up while saving keeps failing, and says which problem it is: a full
// store can be freed, a blocked one cannot, and the advice differs (UID-02).
window.addEventListener(STORAGE_ERROR, (event) => {
  const blocked = event.detail && event.detail.reason === 'blocked';
  hold('storage', t(blocked ? 'status.storageBlocked' : 'status.storageFull'));
});
window.addEventListener(STORAGE_OK, () => release('storage'));

// A generic status line, so features without their own indicator can report one.
// `detail` is the text, or `{ text, hold: true }` for a notice that stays until the
// user edits.
window.addEventListener(STATUS_MESSAGE, (event) => {
  const { detail } = event;
  if (!detail) return;
  if (typeof detail === 'string') showCurrencyStatus(detail);
  else if (detail.hold) hold('recovered', detail.text);
  else showCurrencyStatus(detail.text);
});

window.addEventListener(FONT_SIZE_CHANGED, () => rowRenderer.relayout());

// A line that reads the clock (`now`, `today`, `unix()`) is stale once time has passed,
// so coming back to the page re-evaluates the sheet from the first such line. A sheet
// that never reads the clock is served from the engine's cache.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) evalClient.update();
});
window.addEventListener('focus', () => evalClient.update());

// A setting change forwards the new value to the engine, then recomputes. The
// per-call comments below explain any extra sequencing.
function onSettingUpdated(name, apply) {
  window.addEventListener(name, (event) => {
    apply(event.detail, event);
    evalClient.update();
  });
}

// Switching measurement system re-registers the volume units in the worker and
// the main-thread fallback, then recomputes every line.
onSettingUpdated(MEASUREMENT_UPDATED, (value) => evalClient.syncMeasurement(value));

// Changing the display precision only reformats results, but the worker does
// the formatting, so it needs the new value before the recompute.
onSettingUpdated(PRECISION_UPDATED, (value) => {
  setDecimalPrecision(value);
  evalClient.syncPrecision(value);
});

// Switching the total aggregate recomputes the total (the lines are unchanged,
// but the worker recomputes the total on every evaluation).
onSettingUpdated(TOTAL_MODE_UPDATED, (value) => evalClient.syncTotalMode(value));

// Changing the clock format only reformats clock-time results.
onSettingUpdated(CLOCK_FORMAT_UPDATED, (value) => {
  setClockFormat(value);
  evalClient.syncClockFormat(value);
});

// The composition root runs in a fixed order — that ordering is a contract, so
// boot() states it explicitly rather than leaving it to line position.
function boot() {
  // 0. Resolve the interface language before any module builds its UI.
  initI18n();

  // 1. Capture the onboarding keys BEFORE initTabs persists a fresh collection.
  const onboardingState = readOnboardingState();

  // 2. Tabs own the sheet content and evaluate whatever was restored.
  const tabsApi = initTabs(contentEditableNode, evalClient.update);

  // 3. Features that read or seed the active sheet.
  initShare(tabsApi);
  initDocsLink();
  initRecipes(contentEditableNode);
  initSettings(tabsApi);
  initFontControls(editorScroll.refreshMetrics);
  initIo(contentEditableNode);
  initShortcuts(contentEditableNode, evalClient.requestLines, tabsApi.switchTab);
  initFind(contentEditableNode, viewNode);
  initLineNumbers(contentEditableNode);
  initGoToLine(contentEditableNode);
  // Before initIndent: when the popup is open it swallows Tab, so the
  // autocomplete's keydown listener must run first.
  initAutocomplete(contentEditableNode, editorScroll);
  initIndent(contentEditableNode);
  initTotalMode();

  // 4. The starter prompt is wired before onboarding can seed the sheet that
  //    it floats beneath.
  initStarterPrompt(contentEditableNode);

  // 5. Onboarding seeds the starter sheet last, once everything else is wired.
  initOnboarding(contentEditableNode, tabsApi, onboardingState);
}
// A failed boot must not die silently on a blank page: report it, and leave the
// saved collection untouched (tabs persistence starts inside initTabs, so
// whatever failed before it is never written over).
try {
  boot();
} catch (error) {
  console.error('Math Notes failed to start:', error);
  try {
    showCurrencyStatus(t('status.bootFailed'), true);
  } catch {
    // the translator itself is unavailable
  }
}

// The active sheet is now in the textarea, so the placeholder may show (only
// when the sheet is empty). Keeping it hidden until here avoids a flash of the
// placeholder before a saved sheet is restored.
contentEditableNode.classList.add('ready');

registerServiceWorker();

// Rates are fetched here rather than inside the eval client, and only after
// every CURRENCY listener above exists: the first update can be dispatched
// synchronously from the cache, and the client itself should never have to
// touch the network to be constructed.
fetchRates();
startRateRefresh();
