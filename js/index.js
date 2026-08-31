import linesLoop from './linesLoop.js';
import renderInput from './renderInput.js';
import renderResults from './renderResults.js';
import renderTotal from './renderTotal.js';
import registerServiceWorker from './registerServiceWorker.js';
import controlHelpModal from './dom/help.js';

import './dom/cosmetic.js';

const inputNode = document.getElementById('input');
const contentEditableNode = document.getElementById('content-editable');
const viewNode = document.getElementById('view');
const resultsNode = document.getElementById('results');
const totalNode = document.getElementById('total');

contentEditableNode.focus();

function update() {
  linesLoop(contentEditableNode.childNodes);
  renderInput(viewNode);
  renderResults(resultsNode);
  renderTotal(totalNode);
}

function serializeInput() {
  return [...contentEditableNode.childNodes]
    .map(node => (node.nodeName === 'BR' ? '\n' : node.textContent))
    .join('');
}

function setInputText(text) {
  contentEditableNode.innerHTML = '';
  text.split('\n').forEach((line, index) => {
    if (index > 0) contentEditableNode.appendChild(document.createElement('br'));
    if (line) contentEditableNode.appendChild(document.createTextNode(line));
  });
}

// Trigger changes
contentEditableNode.addEventListener('input', () => {
  window.localStorage.setItem('input', serializeInput());
  update();
});

// Always separate lines with a <br> element
contentEditableNode.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.execCommand('insertLineBreak', false, null);
  }
});

// Only paste text
contentEditableNode.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.originalEvent || e).clipboardData.getData('text/plain');
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    document.execCommand('insertText', false, line);
    if (index < lines.length - 1) {
      document.execCommand('insertLineBreak', false, null);
    }
  });
});

inputNode.addEventListener('click', (event) => {
  if (event.currentTarget === inputNode) {
    contentEditableNode.focus();
  }
});

const savedInput = window.localStorage.getItem('input');
if (savedInput) {
  setInputText(savedInput);
  update();
}

controlHelpModal(contentEditableNode);

registerServiceWorker();