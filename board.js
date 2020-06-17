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
  document.createTextNode('Tests'),
  document.createElement('br'),
  document.createElement('br'),
  document.createTextNode('#Comment'),
  document.createElement('br'),
  document.createTextNode('# Comment with space'),
  document.createElement('br'),
  document.createTextNode('5 + 5 # Comment after calc'),
  document.createElement('br'),
  document.createTextNode('comment = 0 # Comment after variable'),
  document.createElement('br'),
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
  document.createElement('br'),
  document.createTextNode('joinedVariable=5'),
  document.createElement('br'),
  document.createTextNode('joinedVariable+5'),
  document.createElement('br'),
  document.createTextNode('joinedVariable-5'),
  document.createElement('br'),
  document.createTextNode('joinedVariable/5'),
  document.createElement('br'),
  document.createTextNode('joinedVariable^5'),
  document.createElement('br'),
  document.createElement('br'),
  document.createTextNode('5 + 5'),
  document.createElement('br'),
  document.createTextNode('5 - 5'),
  document.createElement('br'),
  document.createTextNode('5 / 5'),
  document.createElement('br'),
  document.createTextNode('5 ^ 5'),
  document.createElement('br'),
  document.createElement('br'),
  document.createTextNode('5+5'),
  document.createElement('br'),
  document.createTextNode('5-5'),
  document.createElement('br'),
  document.createTextNode('5/5'),
  document.createElement('br'),
  document.createTextNode('5^5'),
  document.createElement('br'),
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
  document.createTextNode('20 as a % off 70'),
  document.createElement('br'),
  document.createElement('br'),
  document.createTextNode('5%of100'),
  document.createElement('br'),
  document.createTextNode('5%on100'),
  document.createElement('br'),
  document.createTextNode('5%off100'),
  document.createElement('br'),
  document.createTextNode('50asa%of100'),
  document.createElement('br'),
  document.createTextNode('70asa%on20'),
  document.createElement('br'),
  document.createTextNode('20asa%off70')
];

tests.forEach(test => board.appendChild(test));

updateView();
