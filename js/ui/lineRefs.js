import { setEditorValue } from './editorInput.js';

// Clicking a line's ghost result inserts a `line(n)` reference at the caret.
// The ghost lives behind the transparent textarea, so we hit-test its rectangle
// ourselves on mousedown and prevent the default caret move — the reference is
// inserted where the caret already was, then the caret follows it.
function initLineRefs(editableNode, viewNode) {
  const scroller = editableNode.closest('.editor-scroll');
  if (!scroller) return;

  scroller.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || event.detail > 1) return;
    const ghost = ghostAt(viewNode, event.clientX, event.clientY);
    if (!ghost) return;

    const row = ghost.closest('.line-row');
    const index = row ? Array.prototype.indexOf.call(viewNode.children, row) : -1;
    if (index === -1) return;

    event.preventDefault();
    insertReference(editableNode, index + 1);
  });
}

function ghostAt(viewNode, x, y) {
  for (const ghost of viewNode.querySelectorAll('.ghost-result:not(.error)')) {
    const rect = ghost.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return ghost;
  }
  return null;
}

function insertReference(editableNode, lineNumber) {
  const token = `line(${lineNumber})`;
  const value = editableNode.value;
  const start = editableNode.selectionStart;
  editableNode.focus();
  setEditorValue(editableNode, value.slice(0, start) + token + value.slice(start), {
    start: start + token.length,
    end: start + token.length,
  });
}

export default initLineRefs;
