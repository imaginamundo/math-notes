// Wrapping raw-text match offsets onto the ghost view's DOM.
//
// The view is a sequence of `.line-row` elements with no text for newlines, so
// `textNodesInOrder` walks the text nodes and counts row boundaries as
// newlines, producing offsets in the same space as the raw sheet text.
// Ghost results are skipped so matches never wrap rendered output.
//
// A match spanning several highlighted tokens is wrapped once PER TEXT NODE
// rather than merged into a single mark: merging discarded the token elements
// around it, so clearing the marks left those tokens as unstyled plain text
// until the line was edited. Every mark carries `data-match`, so the caller can
// still treat the segments of one match as a single hit.
//
// Kept separate from js/ui/find.js (which owns the bar, query and replace) so
// the trickiest DOM logic can be reasoned about and tested on its own.

function clearMarks(root) {
  root.querySelectorAll('.find-match').forEach((mark) => {
    // Unwrap rather than replace: what comes out is the original text node, so
    // its token keeps the markup the highlighter gave it.
    mark.replaceWith(...mark.childNodes);
  });
}

function applyMarks(root, matches, activeIndex) {
  clearMarks(root);
  if (!matches.length) return;

  // Single pass: collect every text node with its start offset once, then wrap
  // matches from last to first so DOM mutations only touch text already passed.
  const entries = textNodesInOrder(root);
  if (!entries.length) return;
  const starts = entries.map((entry) => entry.start);

  // Matches are ascending and wrapped from the end, so the containing entry only
  // moves left: one pointer instead of a scan per match.
  let entryIndex = entries.length - 1;
  for (let matchIndex = matches.length - 1; matchIndex >= 0; matchIndex--) {
    const match = matches[matchIndex];
    while (entryIndex > 0 && starts[entryIndex] > match.start) entryIndex--;
    const startIndex = entryIndex;
    if (starts[startIndex] + entries[startIndex].node.textContent.length <= match.start) continue;

    let endIndex = startIndex;
    while (endIndex + 1 < entries.length && starts[endIndex + 1] < match.end) endIndex++;

    const localStart = match.start - starts[startIndex];
    const localEnd = match.end - starts[endIndex];
    const active = matchIndex === activeIndex;

    if (startIndex === endIndex) {
      const node = entries[startIndex].node;
      let target = node;
      if (localStart > 0) {
        node.splitText(localStart);
        target = node.nextSibling;
      }
      if (target.length > match.end - match.start) target.splitText(match.end - match.start);
      wrap(target, matchIndex, active);
    } else {
      if (localStart > 0) entries[startIndex].node.splitText(localStart);
      const startNode =
        localStart > 0 ? entries[startIndex].node.nextSibling : entries[startIndex].node;
      const endNode = entries[endIndex].node;
      if (localEnd < endNode.length) endNode.splitText(localEnd);
      wrap(startNode, matchIndex, active);
      for (let k = startIndex + 1; k < endIndex; k++) wrap(entries[k].node, matchIndex, active);
      wrap(endNode, matchIndex, active);
    }
  }
}

// Wrap one text node in a mark, leaving it inside its original parent so the
// token that owns the text is still the element that styles it.
function wrap(node, matchIndex, active) {
  const mark = document.createElement('mark');
  mark.className = active ? 'find-match active' : 'find-match';
  mark.dataset.match = String(matchIndex);
  node.replaceWith(mark);
  mark.appendChild(node);
}

function textNodesInOrder(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, {
    acceptNode(node) {
      if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
      if (node.nodeType === Node.ELEMENT_NODE) {
        return node.classList.contains('ghost-result')
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_SKIP;
    },
  });
  const entries = [];
  let textLength = 0;
  let rowCount = 0;
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Each line-row represents one newline; rowCount is one ahead of the
      // row being traversed because the row element precedes its text.
      entries.push({ node, start: textLength + Math.max(0, rowCount - 1) });
      textLength += node.textContent.length;
    } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('line-row')) {
      rowCount++;
    }
  }
  return entries;
}

export { clearMarks, applyMarks, textNodesInOrder };
