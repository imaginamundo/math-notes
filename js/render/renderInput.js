import format from './format.js';
import formatResult from './formatResult.js';

// Rendering is two-phase so that what you type never waits on the worker:
// `renderText` redraws the highlighted input synchronously, and `patchResults`
// fills the ghost results in when the evaluation reply lands. Both phases
// share one set of rows so the prefix above the first changed line is never
// rebuilt.
let viewNode = null;
const rows = [];
let lines = [];
let patched = null; // lines[] whose results are currently shown, or null
let dirtyFrom = null; // first row whose result is still outstanding

function reset(view) {
  rows.length = 0;
  lines.length = 0;
  patched = null;
  dirtyFrom = null;
  viewNode = view;
}

// Index of the first differing line, or -1 when the inputs are identical.
function firstDifference(previous, next) {
  const length = Math.max(previous.length, next.length);
  for (let i = 0; i < length; i++) {
    if (previous[i] !== next[i]) return i;
  }
  return -1;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function createRow(line) {
  const row = document.createElement('div');
  row.className = 'line-row';
  row.appendChild(format.line(line));
  return row;
}

function buildRows(view, from, textLines) {
  let node = rows[from];
  while (node) {
    const next = node.nextSibling;
    node.remove();
    node = next;
  }
  rows.length = from;
  for (let i = from; i < textLines.length; i++) {
    const row = createRow(textLines[i]);
    view.appendChild(row);
    rows[i] = row;
  }
}

/**
 * Phase one: redraw the highlighted input rows. Rows from the first changed
 * line on are rebuilt; the unchanged prefix above them is left alone, keeping
 * whatever results it already shows.
 * @param {HTMLElement} view
 * @param {string[]} textLines
 */
export function renderText(view, textLines) {
  if (view !== viewNode) reset(view);
  if (rows.length === 0) {
    buildRows(view, 0, textLines);
    lines = textLines.slice();
    patched = null;
    dirtyFrom = 0;
    return;
  }
  const start = firstDifference(lines, textLines);
  if (start === -1) return;
  buildRows(view, start, textLines);
  lines = textLines.slice();
  patched = null;
  dirtyFrom = dirtyFrom === null ? start : Math.min(dirtyFrom, start);
}

/**
 * Phase two: fill in the ghost results. When the worker reports the sheet
 * unchanged (startLine -1) and these exact lines were already patched, the
 * rows are left untouched.
 * @param {HTMLElement} view
 * @param {string[]} textLines
 * @param {Array} results  Per-line results; values are pre-formatted strings.
 * @param {number} startLine  First line the engine changed (-1 when unchanged).
 */
export function patchResults(view, textLines, results, startLine) {
  if (view !== viewNode || rows.length === 0) return;
  if (startLine === -1 && patched && arraysEqual(patched, textLines)) return;
  const from = dirtyFrom === null ? 0 : dirtyFrom;
  for (let i = from; i < textLines.length; i++) {
    const row = rows[i];
    if (row) patchRow(row, results ? results[i] : undefined);
  }
  patched = textLines.slice();
  dirtyFrom = null;
}

function patchRow(row, result) {
  let ghost = null;
  for (const child of row.children) {
    if (child.classList && child.classList.contains('ghost-result')) {
      ghost = child;
      break;
    }
  }
  const text = ghostText(result);
  if (!text) {
    if (ghost) ghost.remove();
    return;
  }
  if (!ghost) {
    ghost = document.createElement('span');
    row.appendChild(ghost);
  }
  ghost.textContent = text.value;
  ghost.className = 'ghost-result' + (text.error ? ' error' : '');
}

function ghostText(result) {
  if (!result || result.type === 'assignment' || result.value === undefined) return null;
  const error = result.type === 'error';
  return {
    value: error
      ? truncate(String(result.value), 80)
      : `→ ${truncate(formatResult(result.value), 80)}`,
    error,
  };
}

function truncate(text, max) {
  const str = String(text);
  return str.length > max ? `${str.slice(0, max)}…` : str;
}
