import format from './format.js';
import formatResult from './formatResult.js';
import { firstDifference, arraysEqual } from '../util/sequence.js';

// Rendering is two-phase so that what you type never waits on the worker:
// `renderText` redraws the highlighted input synchronously, and `patchResults`
// fills the ghost results in when the evaluation reply lands. Both phases
// share one set of rows so the prefix above the first changed line is never
// rebuilt.
//
// A renderer is bound to a single view element (a factory, so no module-level
// mutable state or implicit view-swap reset).
function createRowRenderer(view) {
  const rows = [];
  let lines = [];
  let patched = null; // lines[] whose results are currently shown, or null
  let dirtyFrom = null; // first row whose result is still outstanding

  function createRow(line) {
    const row = document.createElement('div');
    row.className = 'line-row';
    row.appendChild(format.line(line));
    return row;
  }

  function buildRows(from, textLines) {
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
   * line on are rebuilt; the unchanged prefix above them is left alone,
   * keeping whatever results it already shows.
   * @param {string[]} textLines
   */
  function renderText(textLines) {
    if (rows.length === 0) {
      buildRows(0, textLines);
      lines = textLines.slice();
      patched = null;
      dirtyFrom = 0;
      return;
    }
    const start = firstDifference(lines, textLines);
    if (start === -1) return;
    buildRows(start, textLines);
    lines = textLines.slice();
    patched = null;
    dirtyFrom = dirtyFrom === null ? start : Math.min(dirtyFrom, start);
  }

  /**
   * Phase two: fill in the ghost results. When the worker reports the sheet
   * unchanged (startLine -1) and these exact lines were already patched, the
   * rows are left untouched.
   * @param {string[]} textLines
   * @param {Array} results  Per-line results; values are pre-formatted strings.
   * @param {number} startLine  First line the engine changed (-1 when unchanged).
   */
  function patchResults(textLines, results, startLine) {
    if (rows.length === 0) return;
    if (startLine === -1 && patched && arraysEqual(patched, textLines)) return;
    const from = dirtyFrom === null ? 0 : dirtyFrom;
    for (let i = from; i < textLines.length; i++) {
      const row = rows[i];
      if (row) patchRow(row, results ? results[i] : undefined);
    }
    patched = textLines.slice();
    dirtyFrom = null;
  }

  // A caret on a row with a truncated error shows the full message on that
  // row; every other row stays compact. Call it whenever the active line may
  // have changed (after input/click/selection, and after patching results).
  function updateActiveLine(index) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      let ghost = null;
      for (const child of row.children) {
        if (
          child.classList &&
          child.classList.contains('ghost-result') &&
          child.classList.contains('error')
        ) {
          ghost = child;
          break;
        }
      }
      if (!ghost || !ghost.dataset || ghost.dataset.full === undefined) continue;
      ghost.textContent = i === index ? ghost.dataset.full : ghost.dataset.short;
    }
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
    // Remember a truncated error's full text so the UI can reveal it when the
    // line is active (and put it in a native hover title as a bonus).
    if (text.error && text.full !== text.value) {
      if (ghost.dataset) {
        ghost.dataset.short = text.value;
        ghost.dataset.full = text.full;
      }
      ghost.title = text.full;
    }
  }

  function ghostText(result) {
    if (!result || result.type === 'assignment' || result.value === undefined) return null;
    const error = result.type === 'error';
    if (!error) {
      return { value: `→ ${truncate(formatResult(result.value), 80)}`, error: false };
    }
    const full = String(result.value);
    return { value: truncate(full, 80), error: true, full };
  }

  return { renderText, patchResults, updateActiveLine };
}

function truncate(text, max) {
  const str = String(text);
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

export { createRowRenderer };
