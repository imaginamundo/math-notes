import format from './format.js';
import formatResult from './formatResult.js';

let lastViewNode = null;
const rows = [];

function renderInput(viewNode, lines, results, startLine) {
  if (viewNode !== lastViewNode) {
    rows.length = 0;
    lastViewNode = viewNode;
  }
  if (startLine === -1) return;

  const from = rows.length === 0 ? 0 : startLine || 0;

  // Remove the tail starting at the first changed row; the prefix stays
  // untouched. rows[i] is the block wrapper of line i.
  let node = rows[from];
  while (node) {
    const next = node.nextSibling;
    node.remove();
    node = next;
  }
  rows.length = from;

  for (let i = from; i < lines.length; i++) {
    const row = document.createElement('div');
    row.className = 'line-row';
    row.appendChild(format.line(lines[i]));
    const ghost = ghostResult(results && results[i]);
    if (ghost) row.appendChild(ghost);
    viewNode.appendChild(row);
    rows[i] = row;
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
