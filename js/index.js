import { fetchRates, loadCached } from './eval/currency.js';
import renderInput from './render/renderInput.js';
import renderTotal from './render/renderTotal.js';
import registerServiceWorker from './registerServiceWorker.js';
import initHelpModal from './ui/help.js';
import initRecipes from './ui/recipes.js';
import initSettings from './ui/settings.js';
import initFontControls from './ui/cosmetic.js';
import initTabs from './ui/tabs.js';
import initIo from './ui/io.js';
import initShortcuts from './ui/shortcuts.js';
import initFind from './ui/find.js';
import initLineNumbers from './ui/lineNumbers.js';

const contentEditableNode = document.getElementById('content-editable');
const viewNode = document.getElementById('view');
const totalNode = document.getElementById('total');
const currencyStatusNode = document.getElementById('currency-status');

// Evaluation runs in a Web Worker so heavy sheets never block typing and
// mathjs is only parsed on the worker thread. Falls back to a lazily loaded
// main-thread evaluation when workers are unavailable.
let worker = null;
let latestId = 0;
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

function requestEvaluate(lines) {
  if (worker) {
    return new Promise((resolve, reject) => {
      const id = ++latestId;
      pending.set(id, (data) => {
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

function renderResults(lines, results, total, startLine) {
  renderInput(viewNode, lines, results, startLine);
  renderTotal(totalNode, total);
}

async function update() {
  const lines = contentEditableNode.value.split('\n');
  try {
    const { id, data } = await requestEvaluate(lines);
    if (worker && id !== latestId) return;
    renderResults(lines, data.results, data.total, data.startLine);
  } catch (error) {
    console.error('Failed to update the sheet:', error);
  }
}

let updateTimer = null;

// Run an update now and return when it has rendered (used by find so
// highlights apply to a fresh view).
function flushUpdate() {
  clearTimeout(updateTimer);
  updateTimer = null;
  return update();
}

// Batch rapid typing into a single evaluation on the trailing edge.
function scheduleUpdate() {
  clearTimeout(updateTimer);
  updateTimer = setTimeout(update, 50);
}

// Trigger changes
contentEditableNode.addEventListener('input', scheduleUpdate);

fetchRates();

// Keep the highlighted overlay aligned with the visible input
contentEditableNode.addEventListener('scroll', () => {
  viewNode.scrollTop = contentEditableNode.scrollTop;
  viewNode.scrollLeft = contentEditableNode.scrollLeft;
});

const tabsApi = initTabs(contentEditableNode, update);

initHelpModal(contentEditableNode);
initRecipes(contentEditableNode);
initSettings(contentEditableNode);
initFontControls();
initIo(contentEditableNode);
initShortcuts(
  contentEditableNode,
  (lines) => requestEvaluate(lines).then(({ data }) => data),
  tabsApi.switchTab
);
initFind(contentEditableNode, viewNode, update, flushUpdate);
initLineNumbers(contentEditableNode);

window.addEventListener('currency:updated', (event) => {
  const data = event.detail && event.detail.data;
  if (worker && data) worker.postMessage({ type: 'rates', data });
  update();
  showCurrencyStatus(
    event.detail && event.detail.source === 'cached' ? 'rates: cached' : 'rates: live'
  );
});

window.addEventListener('currency:error', () => {
  update();
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
