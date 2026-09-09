import { createRowRenderer } from './render/renderInput.js';
import renderTotal from './render/renderTotal.js';
import { indexOfLineAt } from './util/text.js';
import registerServiceWorker from './registerServiceWorker.js';
import { createEvalClient } from './evalClient.js';
import initHelpModal from './ui/help.js';
import initRecipes from './ui/recipes.js';
import initSettings from './ui/settings.js';
import initFontControls from './ui/cosmetic.js';
import initTabs from './ui/tabs.js';
import initOnboarding, { readOnboardingState } from './ui/onboarding.js';
import initShare from './ui/share.js';
import initIo from './ui/io.js';
import initShortcuts from './ui/shortcuts.js';
import initFind from './ui/find.js';
import initLineNumbers from './ui/lineNumbers.js';
import initStarterPrompt from './ui/starterPrompt.js';
import initLoadingIndicator from './ui/loading.js';
import initEditorScroll from './ui/editor.js';

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
contentEditableNode.addEventListener('input', () => {
  renderTextLayer(contentEditableNode.value.split('\n'));
  rowRenderer.updateActiveLine(activeLine());
  evalClient.schedule();
});
contentEditableNode.addEventListener('click', () => rowRenderer.updateActiveLine(activeLine()));
contentEditableNode.addEventListener('keyup', () => rowRenderer.updateActiveLine(activeLine()));

// Snapshot before initTabs, which persists a tab collection as it starts up.
const onboardingState = readOnboardingState();

const tabsApi = initTabs(contentEditableNode, evalClient.update);

initShare(tabsApi);
initHelpModal(contentEditableNode);
initRecipes(contentEditableNode);
initSettings(contentEditableNode, tabsApi);
initFontControls(editorScroll.refreshMetrics);
initIo(contentEditableNode);
initShortcuts(contentEditableNode, evalClient.requestLines, tabsApi.switchTab);
initFind(contentEditableNode, viewNode);
initLineNumbers(contentEditableNode);
// Runs before initOnboarding, so it sees the seeded starter sheet appear.
initStarterPrompt(contentEditableNode);

// Last, so every surface the tour points at is already wired.
initOnboarding(contentEditableNode, tabsApi, onboardingState);

window.addEventListener('currency:updated', (event) => {
  evalClient.syncRates(event.detail && event.detail.data);
  evalClient.update();
  showCurrencyStatus(
    event.detail && event.detail.source === 'cached' ? 'rates: cached' : 'rates: live'
  );
});

window.addEventListener('currency:error', () => {
  evalClient.update();
  showCurrencyStatus('exchange rates unavailable');
});

let statusTimer = null;
function showCurrencyStatus(text) {
  currencyStatusNode.textContent = text;
  currencyStatusNode.classList.add('visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => currencyStatusNode.classList.remove('visible'), 5000);
}

registerServiceWorker();
