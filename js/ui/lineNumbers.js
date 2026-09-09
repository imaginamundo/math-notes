import { indexOfLineAt } from '../util/text.js';
import { setEditorValue } from './editorInput.js';

// Toggle a line between code and comment: a line that does not start with a
// '#' gets a "# " prefix; one that does loses a single leading '#' (and one
// following space), so "## x" becomes "# x". Only the leading marker is ever
// touched, so toggling always round-trips.
function toggleLineComment(editableNode, index) {
  const value = editableNode.value;
  const lines = value.split('\n');
  if (index < 0 || index >= lines.length) return;

  const line = lines[index];
  let nextLine;
  if (line.startsWith('#')) {
    nextLine = line.slice(1);
    if (nextLine.startsWith(' ')) nextLine = nextLine.slice(1);
  } else {
    nextLine = '# ' + line;
  }
  if (nextLine === line) return;

  // Keep the caret near where it was: shift it by the length the line grew or
  // shrank at its start.
  const delta = nextLine.length - line.length;
  let lineStart = 0;
  for (let i = 0; i < index; i++) lineStart = value.indexOf('\n', lineStart) + 1;
  const caret = editableNode.selectionStart;
  const column = Math.max(0, Math.min(caret - lineStart, line.length));
  const nextCaret = lineStart + Math.max(0, Math.min(column + delta, nextLine.length));

  lines[index] = nextLine;
  setEditorValue(editableNode, lines.join('\n'), { start: nextCaret, end: nextCaret });
}

function initLineNumbers(editableNode) {
  const gutter = document.createElement('pre');
  gutter.className = 'line-numbers';
  gutter.setAttribute('aria-hidden', 'true');
  editableNode.closest('.input').appendChild(gutter);

  const scroller = editableNode.closest('.editor-scroll');

  const rows = [];
  let caretIndex = 0;

  // Always number every line contiguously (1..N), plus one phantom line for
  // the row you'd land on after Enter, so numbering never has gaps. Rows are
  // reused across renders, so typing only adds or removes the delta.
  function render() {
    const lines = editableNode.value.split('\n');
    caretIndex = indexOfLineAt(editableNode.value, editableNode.selectionStart);
    const rowCount = lines.length + 1;
    while (rows.length < rowCount) {
      const span = document.createElement('span');
      span.textContent = rows.length + 1;
      span.dataset.line = rows.length;
      if (rows.length > 0) gutter.appendChild(document.createTextNode('\n'));
      gutter.appendChild(span);
      rows.push(span);
    }
    while (rows.length > rowCount) {
      const span = rows.pop();
      const separator = span.previousSibling;
      span.remove();
      if (separator && separator.nodeType === 3) separator.remove();
    }
    rows.forEach((span, i) => span.classList.toggle('active', i === caretIndex));
  }

  function sync() {
    const index = indexOfLineAt(editableNode.value, editableNode.selectionStart);
    if (index === caretIndex) return;
    caretIndex = index;
    rows.forEach((span, i) => span.classList.toggle('active', i === index));
  }

  if (scroller) {
    scroller.addEventListener('scroll', () => {
      gutter.scrollTop = scroller.scrollTop;
    });
  }
  gutter.addEventListener('click', (event) => {
    const target = event.target;
    if (!target || !target.dataset || target.dataset.line === undefined) return;
    toggleLineComment(editableNode, Number(target.dataset.line));
  });
  editableNode.addEventListener('input', render);
  editableNode.addEventListener('keyup', sync);
  editableNode.addEventListener('click', sync);

  render();
  if (scroller) gutter.scrollTop = scroller.scrollTop;
}

export default initLineNumbers;
