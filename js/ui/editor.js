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
  // When the content fits, drop the inline size and let the grid track
  // (`minmax(max-content, 1fr)`) stretch both layers to fill the whole editor
  // area, so a tap anywhere focuses the input (and raises the keyboard on
  // iOS). Writing an explicit client-size pixel value here would round to the
  // nearest pixel and overflow the fractional container, forcing a stray
  // scrollbar. Only pin the size once the content is wider/taller than the
  // scroll container.
  // The monospace content extent: line count × row height, longest line ×
  // glyph width, plus padding. The textarea's own scrollWidth/scrollHeight
  // cannot be used to size it: once the box is pinned larger than its content
  // (e.g. after a font-size increase) scrollHeight only reports the box height,
  // so shrinking the font would never let the box come back down.
  function contentExtent(cs, lineHeight) {
    const value = editableNode.value;
    const lines = value.split('\n');
    let longest = 0;
    for (const line of lines) if (line.length > longest) longest = line.length;
    if (!charWidth) measureCharWidth();
    return {
      width: parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + longest * charWidth,
      height: parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + lines.length * lineHeight,
    };
  }

  function syncSize() {
    const cs = getComputedStyle(editableNode);
    const lineHeight = Math.round(parseFloat(cs.fontSize) * 1.65);
    document.documentElement.style.setProperty('--editor-line-height', `${lineHeight}px`);
    const { width, height } = contentExtent(cs, lineHeight);
    editableNode.style.width = width > scroller.clientWidth ? `${Math.ceil(width)}px` : '';
    editableNode.style.height = height > scroller.clientHeight ? `${Math.ceil(height)}px` : '';
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
  return {
    syncSize,
    // The font controls change --app-font-size outside the editor, which makes
    // the cached character width and the --editor-line-height both stale.
    // Re-measure the glyphs and recompute the row metrics to match.
    refreshMetrics() {
      charWidth = 0;
      syncSize();
    },
  };
}

export default initEditorScroll;
