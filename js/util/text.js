// Pure text helpers shared by the editor, line numbers, find and shortcuts.
// Kept free of any DOM or module dependencies so any layer can use them.

// The 0-based index of the line containing `position`.
function indexOfLineAt(text, position) {
  let lineIndex = 0;
  for (let i = 0; i < text.length && i < position; i++) {
    if (text[i] === '\n') lineIndex++;
  }
  return lineIndex;
}

// The character offset where the line containing `position` begins.
function startOfLine(text, position) {
  let start = 0;
  for (let i = 0; i < text.length && i < position; i++) {
    if (text[i] === '\n') start = i + 1;
  }
  return start;
}

// A memoized `value.split('\n')`. Several consumers run per edit (the renderer,
// the editor's sizing, the worker request, autocomplete), so they share one
// allocation per text value. Treat the returned array as read-only.
let linesValue = null;
let linesCache = [];
function sheetLines(value) {
  if (value !== linesValue) {
    linesValue = value;
    linesCache = value.split('\n');
  }
  return linesCache;
}

export { indexOfLineAt, startOfLine, sheetLines };
