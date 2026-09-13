import { indexOfLineAt } from '../util/text.js';
import parseLine from '../core/parseLine.js';
import { setEditorValue } from './editorInput.js';

// Toggle a line between code and comment: a line that is not a comment gets a
// "# " prefix; a comment loses its leading marker (and one following space), so
// "## x" becomes "# x". A tag such as "#food" is not a comment, so toggling it
// comments the line out to "# #food".
function toggleLineComment(editableNode, index) {
  const value = editableNode.value;
  const lines = value.split('\n');
  if (index < 0 || index >= lines.length) return;

  const line = lines[index];
  const parsed = parseLine(line);
  const isComment = line.startsWith('#') && parsed.tags.length === 0 && parsed.comment !== '';
  let nextLine;
  if (isComment) {
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
  function lineCount(value) {
    let count = 1;
    for (let i = 0; i < value.length; i++) if (value[i] === '\n') count++;
    return count;
  }

  // Move the highlight with the caret, touching only the outgoing and incoming
  // rows rather than every row in the sheet.
  function setActive(index) {
    if (rows[caretIndex]) rows[caretIndex].classList.toggle('active', caretIndex === index);
    caretIndex = index;
    if (rows[index]) rows[index].classList.toggle('active', true);
  }

  function render() {
    const value = editableNode.value;
    const rowCount = lineCount(value) + 1;
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
    setActive(indexOfLineAt(value, editableNode.selectionStart));
  }

  function sync() {
    setActive(indexOfLineAt(editableNode.value, editableNode.selectionStart));
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
