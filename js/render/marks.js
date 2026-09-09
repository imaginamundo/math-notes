// Wrapping raw-text match offsets onto the ghost view's DOM.
//
// The view is a sequence of `.line-row` elements with no text for newlines, so
// `textNodesInOrder` walks the text nodes and counts row boundaries as
// newlines, producing offsets in the same space as the raw sheet text.
// Ghost results are skipped so matches never wrap rendered output.
//
// Kept separate from js/ui/find.js (which owns the bar, query and replace) so
// the trickiest DOM logic can be reasoned about and tested on its own.

function clearMarks(root) {
  root.querySelectorAll('.find-match').forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent));
  });
}

function applyMarks(root, matches, activeIndex) {
  clearMarks(root);
  if (!matches.length) return;

  // Single pass: collect every text node with its start offset once, then wrap
  // matches from last to first so DOM mutations only touch text already passed.
  const entries = textNodesInOrder(root);
  const starts = entries.map((entry) => entry.start);

  for (let matchIndex = matches.length - 1; matchIndex >= 0; matchIndex--) {
    const match = matches[matchIndex];
    let startIndex = -1;
    for (let i = 0; i < entries.length; i++) {
      if (starts[i] + entries[i].node.textContent.length > match.start) {
        startIndex = i;
        break;
      }
    }
    if (startIndex === -1) continue;

    let endIndex = startIndex;
    while (endIndex + 1 < entries.length && starts[endIndex + 1] < match.end) endIndex++;

    const localStart = match.start - starts[startIndex];
    const localEnd = match.end - starts[endIndex];
    const mark = document.createElement('mark');
    mark.className = 'find-match' + (matchIndex === activeIndex ? ' active' : '');

    if (startIndex === endIndex) {
      const node = entries[startIndex].node;
      let target = node;
      if (localStart > 0) {
        node.splitText(localStart);
        target = node.nextSibling;
      }
      if (target.length > match.end - match.start) target.splitText(match.end - match.start);
      mark.textContent = target.textContent;
      target.replaceWith(mark);
    } else {
      if (localStart > 0) entries[startIndex].node.splitText(localStart);
      const startNode =
        localStart > 0 ? entries[startIndex].node.nextSibling : entries[startIndex].node;
      if (localEnd < entries[endIndex].node.length) entries[endIndex].node.splitText(localEnd);
      const parts = [startNode];
      for (let k = startIndex + 1; k < endIndex; k++) parts.push(entries[k].node);
      parts.push(entries[endIndex].node);
      mark.textContent = parts.map((node) => node.textContent).join('');
      parts[0].replaceWith(mark);
      for (let k = 1; k < parts.length; k++) parts[k].remove();
    }
  }
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
