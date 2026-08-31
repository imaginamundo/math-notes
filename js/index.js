import { evaluateLines } from './calculate.js';
import renderInput from './renderInput.js';
import renderResults from './renderResults.js';
import renderTotal from './renderTotal.js';
import registerServiceWorker from './registerServiceWorker.js';
import initHelpModal from './dom/help.js';

import initFontControls from './dom/cosmetic.js';

const contentEditableNode = document.getElementById('content-editable');
const viewNode = document.getElementById('view');
const resultsNode = document.getElementById('results');
const totalNode = document.getElementById('total');

function update() {
  const lines = contentEditableNode.value.split('\n');
  const { results, total } = evaluateLines(lines);
  renderInput(viewNode, lines);
  renderResults(resultsNode, results);
  renderTotal(totalNode, total);
}

contentEditableNode.focus();

// Trigger changes
contentEditableNode.addEventListener('input', () => {
  window.localStorage.setItem('input', contentEditableNode.value);
  update();
});

// Keep the highlighted overlay aligned with the visible input
contentEditableNode.addEventListener('scroll', () => {
  viewNode.scrollTop = contentEditableNode.scrollTop;
  viewNode.scrollLeft = contentEditableNode.scrollLeft;
});

const savedInput = window.localStorage.getItem('input');
if (savedInput) {
  contentEditableNode.value = savedInput;
  update();
}

initHelpModal(contentEditableNode);
initFontControls();

window.addEventListener('currency:updated', update);

registerServiceWorker();
