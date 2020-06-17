import parseContent from './parseContent.js';

const board = document.getElementById('board');
const view = document.getElementById('view');
board.focus();

function updateView() {
  const content = parseContent(board.childNodes);
  view.innerHTML = '';
  content.forEach(node => view.appendChild(node));
}

// Listener to trigger changes
board.addEventListener('input', () => {
  updateView();
});


// Listener to paste only text
board.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.originalEvent || e).clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
});

// Add text for test porpuses
const tests = [
  document.createTextNode('# Comment'),
  document.createElement('br'),
  document.createTextNode('variable = 5'),
  document.createElement('br'),
  document.createTextNode('variable + 5'),
  document.createElement('br'),
  document.createTextNode('variable - 5'),
  document.createElement('br'),
  document.createTextNode('variable / 5'),
  document.createElement('br'),
  document.createTextNode('variable ^ 5'),
  document.createElement('br'),
  document.createTextNode('5 + 5'),
  document.createElement('br'),
  document.createTextNode('5 - 5'),
  document.createElement('br'),
  document.createTextNode('5 / 5'),
  document.createElement('br'),
  document.createTextNode('5 ^ 5'),
  document.createElement('br'),
  document.createTextNode('5% of 100'),
  document.createElement('br'),
  document.createTextNode('5% on 100'),
  document.createElement('br'),
  document.createTextNode('5% off 100'),
  document.createElement('br'),
  document.createTextNode('50 as a % of 100'),
  document.createElement('br'),
  document.createTextNode('70 as a % on 20'),
  document.createElement('br'),
  document.createTextNode('20 as a % off 70')
];

tests.forEach(test => board.appendChild(test));

updateView();
