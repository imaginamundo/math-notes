import { indexOfLineAt } from '../util/text.js';
import { setEditorValue } from './editorInput.js';

// Two spaces, matching the editor's monospace grid (the caret/scroll math
// assumes one column per character, so a literal tab would drift).
const INDENT = '  ';

// The character offset where each line starts.
function lineStartOffsets(value) {
  const starts = [0];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

// The first/last line a selection touches. A selection ending exactly at a
// line's start does not include that line (so a trailing newline doesn't indent
// the next line).
function selectedLines(value, start, end) {
  const first = indexOfLineAt(value, start);
  let last = indexOfLineAt(value, end);
  if (end > start && value[end - 1] === '\n') last -= 1;
  return { first, last: Math.max(first, last) };
}

// Indent the selection (or insert the unit at the caret when there is none).
function indentSelection(value, start, end, unit = INDENT) {
  if (start === end) {
    return {
      value: value.slice(0, start) + unit + value.slice(start),
      start: start + unit.length,
      end: end + unit.length,
    };
  }

  const { first, last } = selectedLines(value, start, end);
  const starts = lineStartOffsets(value);
  const insertions = starts.slice(first, last + 1);

  let next = '';
  let prev = 0;
  for (const offset of insertions) {
    next += value.slice(prev, offset) + unit;
    prev = offset;
  }
  next += value.slice(prev);

  const shifted = (position) =>
    position + unit.length * insertions.filter((offset) => offset < position).length;
  return { value: next, start: shifted(start), end: shifted(end) };
}

// Remove up to one indent unit of leading whitespace from a line.
function indentLength(line, unit) {
  if (line.startsWith('\t')) return 1;
  let spaces = 0;
  while (spaces < unit.length && line[spaces] === ' ') spaces++;
  return spaces;
}

// Outdent the selection, or the caret's own line when there is no selection.
function outdentSelection(value, start, end, unit = INDENT) {
  const { first, last } =
    start === end
      ? { first: indexOfLineAt(value, start), last: indexOfLineAt(value, start) }
      : selectedLines(value, start, end);
  const starts = lineStartOffsets(value);

  const removals = [];
  let next = '';
  let prev = 0;
  for (let i = first; i <= last; i++) {
    const offset = starts[i];
    const lineEnd = i + 1 < starts.length ? starts[i + 1] - 1 : value.length;
    const line = value.slice(offset, lineEnd);
    const removed = indentLength(line, unit);
    if (removed > 0) removals.push({ offset, length: removed });
    next += value.slice(prev, offset) + line.slice(removed);
    prev = offset + line.length;
  }
  next += value.slice(prev);

  if (!removals.length) return { value, start, end };

  // Map an original offset through the removals. All comparisons use the
  // original offset (never a progressively shifted one) so a position just
  // before a newline cannot slide onto the next line.
  const shifted = (position) => {
    let removedBefore = 0;
    for (const removal of removals) {
      if (removal.offset >= position) break;
      if (position <= removal.offset + removal.length) return removal.offset - removedBefore;
      removedBefore += removal.length;
    }
    return position - removedBefore;
  };
  return { value: next, start: shifted(start), end: shifted(end) };
}

// Tab indents and Shift+Tab outdents, always trapping focus in the editor (the
// usual code-editor behaviour). Writes go through setEditorValue so undo, the
// renderer, line numbers and find all treat it as a normal edit.
function initIndent(editableNode) {
  editableNode.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (document.querySelector('dialog[open]')) return;

    event.preventDefault();
    const start = editableNode.selectionStart;
    const end = editableNode.selectionEnd;
    const next = event.shiftKey
      ? outdentSelection(editableNode.value, start, end)
      : indentSelection(editableNode.value, start, end);
    if (next.value !== editableNode.value) {
      setEditorValue(editableNode, next.value, { start: next.start, end: next.end });
    }
  });
}

export { INDENT, indentSelection, outdentSelection };
export default initIndent;
