import { indexOfLineAt, startOfLine, sheetLines } from '../util/text.js';

// With the editor layers inside a scroll container, the textarea no longer
// scrolls natively, so the caret must be kept visible manually. The sheet is
// monospace, so the caret position is computed from column and line math.
function initEditorScroll(editableNode) {
  const scroller = editableNode.closest('.editor-scroll');
  if (!scroller) return {};

  // WebKit resets a textarea's selection and the scroll offset when focus arrives by Tab or
  // Shift+Tab (and the next Tab would then indent line 1). Remember them when the editor
  // loses focus and put them back when it gets focus from the keyboard; a click or tap sets
  // its own caret and is left alone.
  let leaving = null;
  let pointerDown = false;
  document.addEventListener('pointerdown', () => (pointerDown = true), true);
  document.addEventListener('pointerup', () => setTimeout(() => (pointerDown = false)), true);
  editableNode.addEventListener('blur', () => {
    leaving = {
      value: editableNode.value,
      start: editableNode.selectionStart,
      end: editableNode.selectionEnd,
      top: scroller.scrollTop,
      left: scroller.scrollLeft,
    };
  });
  editableNode.addEventListener('focus', () => {
    const saved = leaving;
    leaving = null;
    if (!saved || pointerDown || saved.value !== editableNode.value) return;
    // The WebKit symptom is a selection reset to the very start; anything else was set on
    // purpose (a found match, a restored tab) and stays.
    if (editableNode.selectionStart !== 0 || editableNode.selectionEnd !== 0) return;
    if (saved.start === 0 && saved.end === 0) return;
    try {
      editableNode.setSelectionRange(saved.start, saved.end);
    } catch {
      // an unusable selection is ignored
    }
    scroller.scrollTop = saved.top;
    scroller.scrollLeft = saved.left;
  });

  let charWidth = 0;
  let cachedGutterInset = null;
  let metricsCache = null;
  let extentCache = null;
  // The scroller's scroll offset, tracked from its scroll event rather than
  // read here: a read while the rows are still dirty forces a synchronous
  // layout of the whole sheet, which at a few thousand lines costs more than
  // the keystroke that triggered it.
  let scrollerScrollLeft = 0;
  let scrollerScrollTop = 0;
  // The scroller's client size, refreshed by a ResizeObserver, plus the last
  // values written, so a keystroke does not read or invalidate layout.
  let scrollerSize = null;
  let lastLineHeight = null;
  let lastWidth = null;
  let lastHeight = null;

  function measureScroller() {
    scrollerSize = { width: scroller.clientWidth, height: scroller.clientHeight };
  }

  // The editor's font-derived metrics. They only change with the font, theme or
  // viewport, so they are cached (and invalidated by refreshMetrics/resize)
  // rather than re-read with getComputedStyle on every keystroke.
  function metrics() {
    if (!metricsCache) {
      const cs = getComputedStyle(editableNode);
      metricsCache = {
        lineHeight: Math.round(parseFloat(cs.fontSize) * 1.65),
        padLeft: parseFloat(cs.paddingLeft),
        padRight: parseFloat(cs.paddingRight),
        padTop: parseFloat(cs.paddingTop),
        padBottom: parseFloat(cs.paddingBottom),
      };
    }
    return metricsCache;
  }

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
  // so shrinking the font would never let the box come back down. The longest
  // line and count are cached against the text, so the second `syncSize` of an
  // update (after the results patch, with the text unchanged) does no scan.
  function contentExtent(m) {
    const value = editableNode.value;
    if (!extentCache || extentCache.value !== value) {
      const lines = sheetLines(value);
      let longest = 0;
      for (const line of lines) if (line.length > longest) longest = line.length;
      extentCache = { value, longest, count: lines.length };
    }
    if (!charWidth) measureCharWidth();
    return {
      width: m.padLeft + m.padRight + extentCache.longest * charWidth,
      height: m.padTop + m.padBottom + extentCache.count * m.lineHeight,
    };
  }

  function syncSize() {
    const m = metrics();
    if (m.lineHeight !== lastLineHeight) {
      lastLineHeight = m.lineHeight;
      document.documentElement.style.setProperty('--editor-line-height', `${m.lineHeight}px`);
    }
    const { width, height } = contentExtent(m);
    // Use the cached scroller size so a keystroke does not read layout, and only
    // write a size that actually changed so the browser is not invalidated twice.
    if (!scrollerSize) measureScroller();
    const widthValue = width > scrollerSize.width ? `${Math.ceil(width)}px` : '';
    const heightValue = height > scrollerSize.height ? `${Math.ceil(height)}px` : '';
    if (widthValue !== lastWidth) {
      lastWidth = widthValue;
      editableNode.style.width = widthValue;
    }
    if (heightValue !== lastHeight) {
      lastHeight = heightValue;
      editableNode.style.height = heightValue;
    }
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
    const lineStart = startOfLine(value, pos);
    if (!charWidth) measureCharWidth();
    const m = metrics();
    const x = m.padLeft + (pos - lineStart) * charWidth;
    const y = m.padTop + lineIndex * m.lineHeight;
    const margin = 24;
    // The line-number gutter is a fixed, opaque overlay on the left (it mirrors
    // only the vertical scroll), so the left inset must clear its right edge —
    // otherwise scrolling to the start of a line hides the caret behind it.
    const leftInset = gutterInset() + margin;
    const viewWidth = scrollerSize ? scrollerSize.width : scroller.clientWidth;
    const viewHeight = scrollerSize ? scrollerSize.height : scroller.clientHeight;
    let nextLeft = scrollerScrollLeft;
    let nextTop = scrollerScrollTop;
    if (x < nextLeft + leftInset) nextLeft = Math.max(0, x - leftInset);
    else if (x > nextLeft + viewWidth - margin) nextLeft = x - viewWidth + margin;
    if (y < nextTop + margin) nextTop = Math.max(0, y - margin);
    else if (y > nextTop + viewHeight - margin) nextTop = y - viewHeight + margin;
    // Writing the offset back when it already holds that value is free, so the
    // common case (the caret is already in view) touches no layout at all.
    if (nextLeft !== scrollerScrollLeft) {
      scrollerScrollLeft = nextLeft;
      scroller.scrollLeft = nextLeft;
    }
    if (nextTop !== scrollerScrollTop) {
      scrollerScrollTop = nextTop;
      scroller.scrollTop = nextTop;
    }
  }

  // How much of the scroller's left edge the fixed line-number gutter covers,
  // measured relative to the scroller (it is absolutely positioned beside it).
  // The geometry only changes with the font, theme or viewport, so it is cached
  // and invalidated on refreshMetrics/resize rather than measured per keystroke.
  function gutterInset() {
    if (cachedGutterInset === null) {
      const gutter = editableNode.closest('.input')?.querySelector('.line-numbers');
      cachedGutterInset = gutter
        ? Math.max(0, gutter.getBoundingClientRect().right - scroller.getBoundingClientRect().left)
        : 0;
    }
    return cachedGutterInset;
  }

  // Keep the scroll cache in step with scrolling the app does not drive (wheel,
  // trackpad, scrollbar drag, keyboard), and leave caret tracking free of any
  // read that could force layout.
  scroller.addEventListener(
    'scroll',
    () => {
      scrollerScrollLeft = scroller.scrollLeft;
      scrollerScrollTop = scroller.scrollTop;
    },
    { passive: true }
  );
  // The textarea is sized to its own content, so it has no scrollable range to
  // speak of — but if the browser ever does move it while the caret travels
  // (the ghost layer does not scroll with it), the layers would slide apart.
  // Correct it when it happens instead of clearing it on every keystroke: this
  // listener only runs when something actually scrolled, and scroll events land
  // after layout, so the hot path pays nothing for the guarantee.
  editableNode.addEventListener('scroll', () => {
    if (editableNode.scrollTop !== 0) editableNode.scrollTop = 0;
    if (editableNode.scrollLeft !== 0) editableNode.scrollLeft = 0;
  });

  editableNode.addEventListener('input', () => {
    // Sizing is handled once by the composition root after it redraws the
    // rows (js/index.js); this listener only keeps the caret visible.
    scrollCaretIntoView();
  });
  editableNode.addEventListener('keyup', scrollCaretIntoView);
  editableNode.addEventListener('click', scrollCaretIntoView);
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === editableNode) scrollCaretIntoView();
  });
  // Re-measure the font-derived geometry after a font or viewport change, then
  // re-pin the size (the resize can change whether the content overflows).
  window.addEventListener('resize', () => {
    cachedGutterInset = null;
    metricsCache = null;
    extentCache = null;
    scrollerSize = null;
    syncSize();
  });

  // Keep the cached scroller size current without reading layout on every
  // keystroke.
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      measureScroller();
      syncSize();
    }).observe(scroller);
  }

  // The caret's position relative to the scroll content, so an overlay (the
  // autocomplete popup) can sit under it. Uses the same glyph/line metrics as
  // the view layer, so it stays aligned with the ghost text.
  function caretPosition() {
    const value = editableNode.value;
    const pos = editableNode.selectionStart;
    if (pos === null) return null;
    if (!charWidth) measureCharWidth();
    const m = metrics();
    return {
      left: m.padLeft + (pos - startOfLine(value, pos)) * charWidth,
      top: m.padTop + indexOfLineAt(value, pos) * m.lineHeight,
      lineHeight: m.lineHeight,
      charWidth,
    };
  }

  syncSize();
  return {
    syncSize,
    caretPosition,
    // The font controls change the --app-font-scale outside the editor, which
    // makes the cached character width and the --editor-line-height both stale.
    // Re-measure the glyphs and recompute the row metrics to match.
    refreshMetrics() {
      charWidth = 0;
      cachedGutterInset = null;
      metricsCache = null;
      extentCache = null;
      scrollerSize = null;
      syncSize();
    },
  };
}

export default initEditorScroll;
