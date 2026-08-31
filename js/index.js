import { evaluateLines } from './core/calculate.js';
import renderInput from './render/renderInput.js';
import renderResults from './render/renderResults.js';
import renderTotal from './render/renderTotal.js';
import registerServiceWorker from './registerServiceWorker.js';
import initHelpModal from './ui/help.js';
import initFontControls from './ui/cosmetic.js';
import initTabs from './ui/tabs.js';
import initIo from './ui/io.js';
import initShortcuts from './ui/shortcuts.js';

const contentEditableNode = document.getElementById('content-editable');
const viewNode = document.getElementById('view');
const resultsNode = document.getElementById('results');
const totalNode = document.getElementById('total');
const currencyStatusNode = document.getElementById('currency-status');

let lastValue = null;

function update() {
  try {
    const value = contentEditableNode.value;
    const lines = value.split('\n');
    if (value !== lastValue) {
      lastValue = value;
      renderInput(viewNode, lines);
    }
    const { results, total } = evaluateLines(lines);
    renderResults(resultsNode, results);
    renderTotal(totalNode, total);
  } catch (error) {
    console.error('Failed to update the sheet:', error);
  }
}

// Trigger changes
contentEditableNode.addEventListener('input', update);

// Keep the highlighted overlay aligned with the visible input
contentEditableNode.addEventListener('scroll', () => {
  viewNode.scrollTop = contentEditableNode.scrollTop;
  viewNode.scrollLeft = contentEditableNode.scrollLeft;
});

initTabs(contentEditableNode, update);

initHelpModal(contentEditableNode);
initFontControls();
initIo(contentEditableNode);
initShortcuts(contentEditableNode);

window.addEventListener('currency:updated', (event) => {
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
