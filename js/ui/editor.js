import { indexOfLineAt } from './shortcuts.js';

// With the editor layers inside a scroll container, the textarea no longer
// scrolls natively, so the caret must be kept visible manually. The sheet is
// monospace, so the caret position is computed from column and line math.
function initEditorScroll(editableNode) {
  const scroller = editableNode.closest('.editor-scroll');
  if (!scroller) return {};

  let charWidth = 0;

  // The textarea's intrinsic height is ~2 rows (its `rows` attribute), which
  // would shrink the grid and desync the ghost layer, so size it to its own
  // content dimensions. The ghost rows and line numbers use the same integer
  // pixel line height as the textarea (1.65 × font size, rounded), so there is
  // no sub-pixel difference to accumulate into drift over many lines. The
  // browser may also set an internal scroll position while moving the caret;
  // reset it so the overlay stays aligned.
  //
  // Floor the box at the scroll container's size so the textarea covers the
  // whole editor area: a short sheet (or an empty one) still lets a tap
  // anywhere focus the input (and raise the keyboard on iOS). The grid cell
  // stretches both layers to the same box, so they stay aligned.
  function syncSize() {
    const lineHeight = Math.round(parseFloat(getComputedStyle(editableNode).fontSize) * 1.65);
    document.documentElement.style.setProperty('--editor-line-height', `${lineHeight}px`);
    editableNode.style.width = `${Math.max(editableNode.scrollWidth, scroller.clientWidth)}px`;
    editableNode.style.height = `${Math.max(editableNode.scrollHeight, scroller.clientHeight)}px`;
    editableNode.scrollTop = 0;
    editableNode.scrollLeft = 0;
  }

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

  editableNode.addEventListener('input', () => {
    syncSize();
    scrollCaretIntoView();
  });
  editableNode.addEventListener('keyup', scrollCaretIntoView);
  editableNode.addEventListener('click', scrollCaretIntoView);
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === editableNode) scrollCaretIntoView();
  });

  syncSize();
  return { syncSize };
}

export default initEditorScroll;
