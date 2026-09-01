import { indexOfLineAt } from './shortcuts.js';

// The editor layers live inside a scroll container, so the textarea no longer
// scrolls natively and the caret must be kept visible manually. The sheet is
// monospace, so the caret position is computed from column and line math.
function initEditorScroll(editableNode) {
  const scroller = editableNode.closest('.editor-scroll');
  if (!scroller) return {};

  let charWidth = 0;

  function measureCharWidth() {
    const cs = getComputedStyle(editableNode);
    const probe = document.createElement('span');
    probe.textContent = '0';
    probe.style.cssText = `position: absolute; visibility: hidden; white-space: pre; font: ${cs.font};`;
    document.body.appendChild(probe);
    charWidth = probe.getBoundingClientRect().width;
    probe.remove();
  }

  function scrollCaretIntoView() {
    // The grid sizes the textarea to its content, so it must never scroll
    // internally; reset any scroll the browser set while moving the caret.
    editableNode.scrollTop = 0;
    editableNode.scrollLeft = 0;
    if (document.activeElement !== editableNode) return;
    const value = editableNode.value;
    const pos = editableNode.selectionStart;
    if (pos === null) return;
    const lineIndex = indexOfLineAt(value, pos);
    let lineStart = 0;
    for (let i = 0; i < pos; i++) {
      if (value[i] === '\n') lineStart = i + 1;
    }
    if (!charWidth) measureCharWidth();
    const cs = getComputedStyle(editableNode);
    const x = parseFloat(cs.paddingLeft) + (pos - lineStart) * charWidth;
    const y = parseFloat(cs.paddingTop) + lineIndex * parseFloat(cs.lineHeight);
    const margin = 24;
    if (x < scroller.scrollLeft + margin) scroller.scrollLeft = Math.max(0, x - margin);
    else if (x > scroller.scrollLeft + scroller.clientWidth - margin) {
      scroller.scrollLeft = x - scroller.clientWidth + margin;
    }
    if (y < scroller.scrollTop + margin) scroller.scrollTop = Math.max(0, y - margin);
    else if (y > scroller.scrollTop + scroller.clientHeight - margin) {
      scroller.scrollTop = y - scroller.clientHeight + margin;
    }
  }

  editableNode.addEventListener('input', scrollCaretIntoView);
  editableNode.addEventListener('keyup', scrollCaretIntoView);
  editableNode.addEventListener('click', scrollCaretIntoView);
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === editableNode) scrollCaretIntoView();
  });
}

export default initEditorScroll;
