import parseContent from './parseContent.js';

const board = document.getElementById('board');
const view = document.getElementById('view');
board.focus();

// Listener to trigger changes
board.addEventListener('input', (event) => {
  const content = parseContent(board.childNodes);
  view.innerHTML = '';
  content.forEach(node => view.appendChild(node));
});


// Listener to paste only text
board.addEventListener('paste', (e) => {
  e.preventDefault();
  const text = (e.originalEvent || e).clipboardData.getData('text/plain');
  document.execCommand('insertText', false, text);
});