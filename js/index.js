import linesLoop from './linesLoop.js';
import printInputs from './printInputs.js';
import printResults from './printResults.js';
import printTotal from './printTotal.js';

import './dom/cosmetic.js';
import './dom/help.js';

document.execCommand('defaultParagraphSeparator', false, 'br');

const contentEditableNode = document.getElementById('content-editable');
const viewNode= document.getElementById('view');
const resultsNode = document.getElementById('results');
const totalNode = document.getElementById('total');

contentEditableNode.focus();

function update() {
  linesLoop(contentEditableNode.childNodes);
  printInputs(viewNode);
  printResults(resultsNode);
  printTotal(totalNode);
}

// Trigger changes
contentEditableNode.addEventListener('input', () => update());

// Only paste text
contentEditableNode.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.originalEvent || e).clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
});

const inputNode = document.getElementById('input');
inputNode.addEventListener('click', (event) => {
  if (event.currentTarget === inputNode) {
    contentEditableNode.focus();
  }
});

export { contentEditableNode };