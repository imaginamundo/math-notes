import updateResults from './results.js';
import updateView from './contentEditable.js';

document.execCommand('defaultParagraphSeparator', false, 'br');

const contentEditableNode = document.getElementById('content-editable');
const viewNode= document.getElementById('view');
const resultsNode = document.getElementById('results');

contentEditableNode.focus();

// Trigger changes
contentEditableNode.addEventListener('input', () => {
  updateView(contentEditableNode, viewNode);
  updateResults(resultsNode);
});

// Only paste text
contentEditableNode.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.originalEvent || e).clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
});

// Add text for test porpuses
/*
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
  document.createTextNode('20asa%off70'),
  document.createElement('br'),
  document.createElement('br'),
  document.createTextNode('(5 + 5) * 5'),
  document.createElement('br'),
  document.createTextNode('20 * ((5 + 5) * 5) / variable '),
  document.createElement('br')
];

tests.forEach(test => contentEditableNode.appendChild(test));

updateView(contentEditableNode, viewNode);
updateResults(resultsNode);
*/