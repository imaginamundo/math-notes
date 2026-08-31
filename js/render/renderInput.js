import format from './format.js';

function renderInput(viewNode, lines) {
  viewNode.innerHTML = '';
  lines.forEach((line, index) => {
    if (index > 0) viewNode.appendChild(document.createElement('br'));
    viewNode.appendChild(format.line(line));
  });
}

export default renderInput;
