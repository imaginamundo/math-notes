import format from './format.js';
import formatResult from './formatResult.js';

function renderInput(viewNode, lines, results) {
  viewNode.innerHTML = '';
  lines.forEach((line, index) => {
    if (index > 0) viewNode.appendChild(document.createElement('br'));
    viewNode.appendChild(format.line(line));
    const ghost = ghostResult(results && results[index]);
    if (ghost) viewNode.appendChild(ghost);
  });
}

function ghostResult(result) {
  if (!result || result.type === 'assignment' || result.value === undefined) return null;
  const span = document.createElement('span');
  span.className = 'ghost-result' + (result.type === 'error' ? ' error' : '');
  const text = result.type === 'error' ? result.value : `→ ${formatResult(result.value)}`;
  span.textContent = truncate(text, 80);
  return span;
}

function truncate(text, max) {
  const str = String(text);
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

export default renderInput;
