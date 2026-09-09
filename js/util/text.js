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

export { indexOfLineAt, startOfLine };
