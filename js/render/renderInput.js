import format from './format.js';
import formatResult from './formatResult.js';

let lastViewNode = null;
const lineStart = [];

function renderInput(viewNode, lines, results, startLine) {
  if (viewNode !== lastViewNode) {
    lineStart.length = 0;
    lastViewNode = viewNode;
  }
  if (startLine === -1) return;

  const from = lineStart.length === 0 ? 0 : startLine || 0;

  // Remove the tail starting at the first changed line; the prefix DOM stays
  // untouched. lineStart[i] is the first node of line i (the <br> before it,
  // or the line itself for line 0).
  let node = lineStart[from];
  while (node) {
    const next = node.nextSibling;
    node.remove();
    node = next;
  }
  lineStart.length = from;

  for (let i = from; i < lines.length; i++) {
    const firstNode = i === 0 ? null : document.createElement('br');
    if (firstNode) viewNode.appendChild(firstNode);
    const lineNode = format.line(lines[i]);
    viewNode.appendChild(lineNode);
    const ghost = ghostResult(results && results[i]);
    if (ghost) viewNode.appendChild(ghost);
    lineStart[i] = firstNode || lineNode;
  }
}

function ghostResult(result) {
  if (!result || result.type === 'assignment' || result.value === undefined) return null;
  const span = document.createElement('span');
  span.className = 'ghost-result' + (result.type === 'error' ? ' error' : '');
  const text =
    result.type === 'error'
      ? truncate(result.value, 80)
      : `→ ${truncate(formatResult(result.value), 80)}`;
  span.textContent = text;
  return span;
}

function truncate(text, max) {
  const str = String(text);
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

export default renderInput;
