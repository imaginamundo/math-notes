import { createRowRenderer } from './render/renderInput.js';
import renderTotal from './render/renderTotal.js';
import { indexOfLineAt, sheetLines } from './util/text.js';
import registerServiceWorker from './registerServiceWorker.js';
import { createEvalClient } from './evalClient.js';
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

function renderResultLayer(lines, data) {
  rowRenderer.patchResults(lines, data.results, data.startLine);
  renderTotal(totalNode, data.total);
  rowRenderer.updateActiveLine(activeLine());
  editorScroll.syncSize();
}

const evalClient = createEvalClient(
  contentEditableNode,
  renderTextLayer,
  renderResultLayer,
  (busy) => (busy ? loadingIndicator.show() : loadingIndicator.hide())
);

// Trigger changes: redraw what you typed immediately, then evaluate in the
// worker on a debounce and fill the results in when it replies.
contentEditableNode.addEventListener('input', (event) => {
  renderTextLayer(sheetLines(contentEditableNode.value));
  rowRenderer.updateActiveLine(activeLine());
  // A programmatic write (tab switch, undo/redo, seed) is evaluated immediately
  // by the tab controller, so only a user edit needs the debounced schedule.
  if (!event.programmatic) evalClient.schedule();
});
contentEditableNode.addEventListener('click', () => rowRenderer.updateActiveLine(activeLine()));
contentEditableNode.addEventListener('keyup', () => rowRenderer.updateActiveLine(activeLine()));

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
  window.addEventListener(FONT_SIZE_CHANGED, () => rowRenderer.relayout());
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
boot();

// The active sheet is now in the textarea, so the placeholder may show (only
// when the sheet is empty). Keeping it hidden until here avoids a flash of the
// placeholder before a saved sheet is restored.
contentEditableNode.classList.add('ready');

window.addEventListener(CURRENCY_UPDATED, (event) => {
  evalClient.syncRates(event.detail && event.detail.data);
  evalClient.update();
  const source = event.detail && event.detail.source;
  const key =
    source === 'cached'
      ? 'status.ratesCached'
      : source === 'stale'
        ? 'status.ratesStale'
        : 'status.ratesLive';
  showCurrencyStatus(t(key));
});

window.addEventListener(CURRENCY_ERROR, () => {
  evalClient.update();
  showCurrencyStatus(t('status.ratesUnavailable'));
});

// A failed localStorage write (usually the quota is full) must not be silent.
window.addEventListener(STORAGE_ERROR, () => {
  showCurrencyStatus(t('status.storageFull'));
});

// A generic status line, so features without their own indicator can report one.
window.addEventListener(STATUS_MESSAGE, (event) => {
  if (event.detail) showCurrencyStatus(event.detail);
});

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

let statusTimer = null;
function showCurrencyStatus(text) {
  currencyStatusNode.textContent = text;
  currencyStatusNode.classList.add('visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => currencyStatusNode.classList.remove('visible'), 5000);
}

registerServiceWorker();
