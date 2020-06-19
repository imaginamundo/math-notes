import updateResults from './results.js';
import updateView from './input.js';
import updateTotal from './total.js';

document.execCommand('defaultParagraphSeparator', false, 'br');

const contentEditableNode = document.getElementById('content-editable');
const viewNode= document.getElementById('view');
const resultsNode = document.getElementById('results');
const totalNode = document.getElementById('total');

contentEditableNode.focus();

function update() {
  updateView(contentEditableNode, viewNode);
  updateResults(resultsNode);
  updateTotal(totalNode);
}

// Trigger changes
contentEditableNode.addEventListener('input', () => update());

// Only paste text
contentEditableNode.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.originalEvent || e).clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
});

