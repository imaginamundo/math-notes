import updateResults from './results.js';
import updateView from './input.js';
import updateTotal from './total.js';

document.execCommand('defaultParagraphSeparator', false, 'br');

const contentEditableNode = document.getElementById('content-editable');
const viewNode= document.getElementById('view');
const resultsNode = document.getElementById('results');
const totalNode = document.getElementById('total');
const helpButtonNode = document.getElementById('help-button');
const helpModalNode = document.getElementById('help-modal');
const fontMinusNode = document.getElementById('font-minus');
const fontPlusNode = document.getElementById('font-plus');
const fontResetNode = document.getElementById('font-reset');

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

// Helper modal toggle
helpButtonNode.addEventListener('click', () => {
  helpModalNode.style.display = 'block'; 
});

helpModalNode.addEventListener('click', () => {
  helpModalNode.style.display = 'none';
  contentEditableNode.focus();
});

// Change font-size
const fontSize = {
  min: 10,
  max: 80,
  current: 14
};
function setFontSize() {
  window.localStorage.fontSize = fontSize.current;
  document.body.style.fontSize = `${ fontSize.current }px`;
}
fontMinusNode.addEventListener('click', () => {
  if (fontSize.current <= fontSize.min) return;
  fontSize.current--;
  setFontSize();
});

fontPlusNode.addEventListener('click', () => {
  if (fontSize.current >= fontSize.max) return;
  fontSize.current++;
  setFontSize();
});
fontResetNode.addEventListener('click', () => {
  if (fontSize.current >= fontSize.max) return;
  fontSize.current = 14;
  setFontSize();
});

if (window.localStorage.fontSize) {
  fontSize.current = window.localStorage.fontSize;
  setFontSize();
}

// Fix firefox without height: fill-available
if (navigator.userAgent.toLowerCase().indexOf('firefox') !== -1) {
  const inputNode = document.getElementById('input');
  inputNode.addEventListener('click', (event) => {
    if (event.currentTarget === inputNode) {
      contentEditableNode.focus();
    }
  })
}