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

  // Replace just the highlighted `.line` of a row, keeping its ghost and group
  // classes in place, so typing inside a line never tears down the view.
  function updateRow(index, line) {
    const row = rows[index];
    if (!row) {
      const created = createRow(line);
      view.appendChild(created);
      rows[index] = created;
      return;
    }
    const fresh = format.line(line);
    const current = row.firstChild;
    if (current) row.replaceChild(fresh, current);
    else row.appendChild(fresh);
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
    if (textLines.length === lines.length) {
      // Same shape: patch only the lines whose text changed, leaving every
      // other row (and its result/box) untouched.
      for (let i = start; i < textLines.length; i++) {
        if (lines[i] !== textLines[i]) updateRow(i, textLines[i]);
      }
    } else {
      buildRows(start, textLines);
    }
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
    // Patch from the earliest row that may need a new result. `dirtyFrom` is
    // the first changed line, but the engine can start earlier — a group's
    // subtotal lives on a header above the edited line, so it reports that
    // header as `startLine`.
    const textFrom = dirtyFrom === null ? 0 : dirtyFrom;
    const resultFrom = startLine >= 0 ? startLine : 0;
    const from = Math.min(textFrom, resultFrom);
    for (let i = from; i < textLines.length; i++) {
      const row = rows[i];
      if (row) patchRow(row, results ? results[i] : undefined);
    }
    // Group shading is applied to every row (not just the changed tail) so a
    // group that disappeared above the patch point loses its background too.
    for (let i = 0; i < textLines.length; i++) {
      const row = rows[i];
      if (row) setGroupClass(row, results && results[i] ? results[i].group : undefined);
    }
    layoutGroups();
    patched = textLines.slice();
    dirtyFrom = null;
  }

  function setGroupClass(row, group) {
    row.classList.toggle('group-header', group === 'header');
    row.classList.toggle('group-body', group === 'body');
    row.classList.toggle('group-end', group === 'end');
  }

  // A group shades as one box: every row in the group is widened to the widest
  // row (including its ghost), so the background no longer hugs each line's
  // text length. Rounded corners are drawn by CSS on the first/last row.
  function layoutGroups() {
    if (typeof view.offsetWidth !== 'number') return;
    let i = 0;
    while (i < rows.length) {
      const first = rows[i];
      if (!first || !first.classList.contains('group-header')) {
        i++;
        continue;
      }
      const groupRows = [];
      while (i < rows.length) {
        const row = rows[i];
        if (!row) break;
        groupRows.push(row);
        const isEnd = row.classList.contains('group-end');
        i++;
        if (isEnd) break;
      }
      for (const row of groupRows) row.style.width = '';
      let widest = 0;
      for (const row of groupRows) widest = Math.max(widest, row.offsetWidth);
      if (widest > 0) {
        const width = `${Math.ceil(widest)}px`;
        for (const row of groupRows) row.style.width = width;
      }
    }
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

  return { renderText, patchResults, updateActiveLine, relayout: layoutGroups };
}

function truncate(text, max) {
  const str = String(text);
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

export { createRowRenderer };
