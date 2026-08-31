function initFind(editableNode, viewNode, onUpdate) {
  const barNode = buildBar();
  const findInput = barNode.querySelector('.find-input');
  const replaceInput = barNode.querySelector('.replace-input');
  const countNode = barNode.querySelector('.find-count');
  const prevButton = barNode.querySelector('.find-prev');
  const nextButton = barNode.querySelector('.find-next');
  const caseButton = barNode.querySelector('.find-case');
  const closeButton = barNode.querySelector('.find-close');
  const replaceOneButton = barNode.querySelector('.replace-one');
  const replaceAllButton = barNode.querySelector('.replace-all');

  editableNode.parentElement.appendChild(barNode);

  let query = '';
  let caseSensitive = false;
  let matches = [];
  let activeIndex = -1;

  function open() {
    const selected = editableNode.value.slice(
      editableNode.selectionStart,
      editableNode.selectionEnd
    );
    if (selected && !selected.includes('\n')) findInput.value = selected;
    barNode.classList.add('open');
    refresh(true, true);
    findInput.focus();
    findInput.select();
  }

  function close() {
    if (!barNode.classList.contains('open')) return;
    barNode.classList.remove('open');
    matches = [];
    activeIndex = -1;
    clearMarks(viewNode);
    updateCounter();
    editableNode.focus();
  }

  function refresh(renderView, scrollTo) {
    const prevAnchor =
      activeIndex !== -1 && matches[activeIndex]
        ? matches[activeIndex].start
        : editableNode.selectionStart;
    query = findInput.value;
    if (renderView) onUpdate();
    if (!query) {
      matches = [];
      activeIndex = -1;
      clearMarks(viewNode);
      updateCounter();
      return;
    }
    matches = computeMatches(editableNode.value, query, caseSensitive);
    if (!matches.length) {
      activeIndex = -1;
      clearMarks(viewNode);
      updateCounter();
      return;
    }
    activeIndex = nearestIndex(matches, prevAnchor);
    applyMarks(viewNode, matches, activeIndex);
    updateCounter();
    if (scrollTo) scrollToActive();
  }

  function next() {
    if (!matches.length) return;
    activeIndex = (activeIndex + 1) % matches.length;
    renderActive();
  }

  function prev() {
    if (!matches.length) return;
    activeIndex = (activeIndex - 1 + matches.length) % matches.length;
    renderActive();
  }

  function renderActive() {
    viewNode.querySelectorAll('.find-match').forEach((mark, index) => {
      mark.classList.toggle('active', index === activeIndex);
    });
    updateCounter();
    scrollToActive();
  }

  function replaceCurrent() {
    if (!query || activeIndex === -1) return;
    const match = matches[activeIndex];
    const replacement = replaceInput.value;
    editableNode.value =
      editableNode.value.slice(0, match.start) + replacement + editableNode.value.slice(match.end);
    editableNode.selectionStart = editableNode.selectionEnd = match.start + replacement.length;
    editableNode.dispatchEvent(new Event('input', { bubbles: true }));
    scrollToActive();
    replaceInput.focus();
  }

  function replaceAll() {
    if (!query || !matches.length) return;
    const replacement = replaceInput.value;
    const value = editableNode.value;
    let out = '';
    let last = 0;
    for (const match of matches) {
      out += value.slice(last, match.start) + replacement;
      last = match.end;
    }
    out += value.slice(last);
    editableNode.value = out;
    editableNode.selectionStart = editableNode.selectionEnd = editableNode.value.length;
    editableNode.dispatchEvent(new Event('input', { bubbles: true }));
    scrollToActive();
    replaceInput.focus();
  }

  function updateCounter() {
    countNode.textContent = matches.length ? `${activeIndex + 1}/${matches.length}` : '';
  }

  function scrollToActive() {
    const mark = viewNode.querySelector('.find-match.active');
    if (!mark) return;
    editableNode.scrollTop = Math.max(0, mark.offsetTop - editableNode.clientHeight / 2);
    editableNode.scrollLeft = Math.max(0, mark.offsetLeft - editableNode.clientWidth / 2);
  }

  findInput.addEventListener('input', () => refresh(true, true));
  findInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) prev();
      else next();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  replaceInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      replaceCurrent();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  prevButton.addEventListener('click', prev);
  nextButton.addEventListener('click', next);
  closeButton.addEventListener('click', close);
  caseButton.addEventListener('click', () => {
    caseSensitive = !caseSensitive;
    caseButton.classList.toggle('active', caseSensitive);
    refresh(true, true);
  });
  replaceOneButton.addEventListener('click', replaceCurrent);
  replaceAllButton.addEventListener('click', replaceAll);

  editableNode.addEventListener('input', () => {
    if (barNode.classList.contains('open')) refresh(false, false);
  });

  document.addEventListener('keydown', (event) => {
    if (document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape' && barNode.classList.contains('open')) {
      event.preventDefault();
      close();
      return;
    }
    const mod = event.metaKey || event.ctrlKey;
    if (!mod || event.shiftKey || event.key.toLowerCase() !== 'f') return;
    event.preventDefault();
    if (barNode.classList.contains('open')) {
      findInput.focus();
      findInput.select();
      return;
    }
    open();
  });

  return { open, close };
}

function buildBar() {
  const bar = document.createElement('div');
  bar.className = 'find-bar';
  bar.setAttribute('role', 'search');

  const findRow = row(
    input('find-input', 'Find in sheet', 'Find in sheet'),
    count('find-count'),
    button('find-prev', '↑', 'Previous match (Shift+Enter)'),
    button('find-next', '↓', 'Next match (Enter)'),
    button('find-case', 'Aa', 'Match case'),
    button('find-close', '×', 'Close (Escape)')
  );
  const replaceRow = row(
    input('replace-input', 'Replace with', 'Replace with'),
    button('replace-one', 'Replace', 'Replace current match (Enter)'),
    button('replace-all', 'All', 'Replace all matches')
  );

  bar.appendChild(findRow);
  bar.appendChild(replaceRow);
  return bar;
}

function row(...children) {
  const wrap = document.createElement('div');
  wrap.className = 'find-row';
  children.forEach((child) => wrap.appendChild(child));
  return wrap;
}

function input(className, placeholder, ariaLabel) {
  const node = document.createElement('input');
  node.type = 'text';
  node.className = className;
  node.placeholder = placeholder;
  node.setAttribute('aria-label', ariaLabel);
  node.autocomplete = 'off';
  node.spellcheck = false;
  return node;
}

function count(className) {
  const node = document.createElement('span');
  node.className = className;
  node.setAttribute('aria-live', 'polite');
  return node;
}

function button(className, label, title) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.textContent = label;
  node.title = title;
  return node;
}

function computeMatches(text, query, caseSensitive) {
  if (!query) return [];
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const list = [];
  let from = 0;
  while (from <= text.length) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) break;
    list.push({ start: index, end: index + needle.length });
    from = index + needle.length;
  }
  return list;
}

function nearestIndex(matches, anchor) {
  for (let i = 0; i < matches.length; i++) {
    if (matches[i].start >= anchor) return i;
  }
  return matches.length - 1;
}

function clearMarks(root) {
  root.querySelectorAll('.find-match').forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent));
  });
}

function applyMarks(root, matches, activeIndex) {
  clearMarks(root);
  for (let matchIndex = 0; matchIndex < matches.length; matchIndex++) {
    const match = matches[matchIndex];
    const entries = textNodesInOrder(root);
    let startIndex = -1;
    let endIndex = -1;
    for (let i = 0; i < entries.length; i++) {
      const nodeEnd = entries[i].start + entries[i].node.textContent.length;
      if (startIndex === -1 && nodeEnd > match.start) startIndex = i;
      if (nodeEnd >= match.end) {
        endIndex = i;
        break;
      }
    }
    if (startIndex === -1 || endIndex === -1) continue;

    const nodes = entries.map((entry) => entry.node);
    const starts = entries.map((entry) => entry.start);
    const localStart = match.start - starts[startIndex];
    const localEnd = match.end - starts[endIndex];
    const mark = document.createElement('mark');
    mark.className = 'find-match' + (matchIndex === activeIndex ? ' active' : '');

    if (startIndex === endIndex) {
      const node = nodes[startIndex];
      let target = node;
      if (localStart > 0) {
        node.splitText(localStart);
        target = node.nextSibling;
      }
      if (target.length > match.end - match.start) target.splitText(match.end - match.start);
      mark.textContent = target.textContent;
      target.replaceWith(mark);
    } else {
      if (localStart > 0) nodes[startIndex].splitText(localStart);
      const startNode = localStart > 0 ? nodes[startIndex].nextSibling : nodes[startIndex];
      if (localEnd < nodes[endIndex].length) nodes[endIndex].splitText(localEnd);
      const parts = [startNode];
      for (let k = startIndex + 1; k < endIndex; k++) parts.push(nodes[k]);
      parts.push(nodes[endIndex]);
      mark.textContent = parts.map((node) => node.textContent).join('');
      parts[0].replaceWith(mark);
      for (let k = 1; k < parts.length; k++) parts[k].remove();
    }
  }
}

function textNodesInOrder(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, {
    acceptNode(node) {
      if (node.nodeName === 'BR') return NodeFilter.FILTER_ACCEPT;
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
  let brCount = 0;
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeName === 'BR') {
      brCount++;
    } else if (node.nodeType === Node.TEXT_NODE) {
      entries.push({ node, start: textLength + brCount });
      textLength += node.textContent.length;
    }
  }
  return entries;
}

export { computeMatches, nearestIndex };
export default initFind;
