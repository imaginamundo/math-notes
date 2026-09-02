import renderInput from './render/renderInput.js';
import renderTotal from './render/renderTotal.js';
import registerServiceWorker from './registerServiceWorker.js';
import { createEvalClient } from './evalClient.js';
import initHelpModal from './ui/help.js';
import initRecipes from './ui/recipes.js';
import initSettings from './ui/settings.js';
import initFontControls from './ui/cosmetic.js';
import initTabs from './ui/tabs.js';
import initIo from './ui/io.js';
import initShortcuts from './ui/shortcuts.js';
import initFind from './ui/find.js';
import initLineNumbers from './ui/lineNumbers.js';
import initEditorScroll from './ui/editor.js';

const contentEditableNode = document.getElementById('content-editable');
const viewNode = document.getElementById('view');
const totalNode = document.getElementById('total');
const currencyStatusNode = document.getElementById('currency-status');

// Evaluation runs in a Web Worker owned by the eval client, which debounces
// updates, gates stale renders, and forwards currency rates.
const evalClient = createEvalClient(contentEditableNode, (lines, data) => {
  renderInput(viewNode, lines, data.results, data.startLine, data.kinds);
  renderTotal(totalNode, data.total);
  editorScroll.syncSize();
});

// Trigger changes
contentEditableNode.addEventListener('input', evalClient.schedule);

const editorScroll = initEditorScroll(contentEditableNode);

const tabsApi = initTabs(contentEditableNode, evalClient.update);

initHelpModal(contentEditableNode);
initRecipes(contentEditableNode);
initSettings(contentEditableNode, tabsApi);
initFontControls();
initIo(contentEditableNode);
initShortcuts(contentEditableNode, evalClient.requestLines, tabsApi.switchTab);
initFind(contentEditableNode, viewNode, evalClient.update, evalClient.flush);
initLineNumbers(contentEditableNode);

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
