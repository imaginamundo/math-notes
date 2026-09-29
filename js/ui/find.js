import { clearMarks, applyMarks } from '../render/marks.js';
import { setEditorValue } from './editorInput.js';
import { t } from '../i18n/index.js';
import { LANGUAGE_UPDATED } from '../util/events.js';

function initFind(editableNode, viewNode) {
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

  function label(node, text) {
    node.title = text;
    node.setAttribute('aria-label', text);
  }

  function refreshLabels() {
    findInput.placeholder = t('find.placeholder');
    findInput.setAttribute('aria-label', t('find.placeholder'));
    label(caseButton, t('find.matchCase'));
    label(prevButton, t('find.previous'));
    label(nextButton, t('find.next'));
    label(closeButton, t('find.close'));
    replaceInput.placeholder = t('find.replacePlaceholder');
    replaceInput.setAttribute('aria-label', t('find.replacePlaceholder'));
    replaceOneButton.textContent = t('find.replace');
    label(replaceOneButton, t('find.replaceHint'));
    replaceAllButton.textContent = t('find.all');
    label(replaceAllButton, t('find.replaceAll'));
  }
  refreshLabels();
  window.addEventListener(LANGUAGE_UPDATED, refreshLabels);

  // Anchor the bar to the editor box (`.input`), not the scrolling content, so
  // it stays pinned at the top-right while the sheet scrolls.
  (editableNode.closest('.input') || editableNode.parentElement).appendChild(barNode);

  let query = '';
  let caseSensitive = false;
  let matches = [];
  let activeIndex = -1;
  // Where a replace just ended, so the re-mark picks the next match after it
  // instead of wrapping back onto a match inside the inserted text.
  let replaceAnchor = null;

  function open() {
    const selected = editableNode.value.slice(
      editableNode.selectionStart,
      editableNode.selectionEnd
    );
    if (selected && !selected.includes('\n')) findInput.value = selected;
    barNode.classList.add('open');
    refresh(true);
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

  // Matches only ever depend on the sheet text and the query, and phase-one
  // rendering keeps the view rows current synchronously, so marking needs no
  // worker round-trip. The view is rebuilt on the editor's input event, which
  // is why this also runs (without scrolling) when the sheet changes.
  function refresh(scrollTo) {
    const replacing = replaceAnchor !== null;
    const prevAnchor = replacing
      ? replaceAnchor
      : activeIndex !== -1 && matches[activeIndex]
        ? matches[activeIndex].start
        : editableNode.selectionStart;
    replaceAnchor = null;
    query = findInput.value;
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
    // A replace continues from the inserted text: wrapping back would keep
    // matching a replacement that contains the query and grow it forever.
    activeIndex = replacing
      ? matches.findIndex((match) => match.start >= prevAnchor)
      : nearestIndex(matches, prevAnchor);
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
    const value =
      editableNode.value.slice(0, match.start) + replacement + editableNode.value.slice(match.end);
    const caret = match.start + replacement.length;
    replaceAnchor = caret;
    setEditorValue(editableNode, value, { start: caret, end: caret });
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
    const caret = out.length;
    setEditorValue(editableNode, out, { start: caret, end: caret });
    scrollToActive();
    replaceInput.focus();
  }

  function updateCounter() {
    countNode.textContent = matches.length ? `${activeIndex + 1}/${matches.length}` : '';
  }

  function scrollToActive() {
    const mark = viewNode.querySelector('.find-match.active');
    if (!mark) return;
    mark.scrollIntoView({ block: 'center', inline: 'center' });
  }

  findInput.addEventListener('input', () => refresh(false));
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
    refresh(true);
  });
  replaceOneButton.addEventListener('click', replaceCurrent);
  replaceAllButton.addEventListener('click', replaceAll);

  // The editor's own input handler has already redrawn the view rows by the
  // time this listener runs, so rematch against the new text synchronously —
  // no worker round-trip is needed just to keep the marks in place.
  editableNode.addEventListener('input', () => {
    if (barNode.classList.contains('open')) refresh(false);
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
    inputWrap(
      input('find-input', 'Find in sheet', 'Find in sheet'),
      button('find-case', 'Aa', 'Match case')
    ),
    count('find-count'),
    button('find-prev', '↑', 'Previous match (Shift+Enter)'),
    button('find-next', '↓', 'Next match (Enter)'),
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

function inputWrap(...children) {
  const wrap = document.createElement('div');
  wrap.className = 'find-input-wrap';
  children.forEach((child) => wrap.appendChild(child));
  return wrap;
}

function input(className, placeholder, ariaLabel) {
  const node = document.createElement('input');
  node.type = 'text';
  node.className = `find-field ${className}`;
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
  if (title) node.setAttribute('aria-label', title);
  return node;
}

/**
 * Find all non-overlapping occurrences of a query in the sheet text.
 * @param {string} text
 * @param {string} query
 * @param {boolean} caseSensitive
 * @returns {Array<{ start: number, end: number }>}
 */
// The lowercased sheet is cached between keystrokes, so a search is one indexOf
// scan rather than slicing and lowercasing at every position.
let lowerCache = { text: null, value: '' };

function lowerOf(text) {
  if (lowerCache.text !== text) lowerCache = { text, value: text.toLowerCase() };
  return lowerCache.value;
}

// Non-overlapping occurrences of `needle` in `haystack`, in order.
function scan(haystack, needle) {
  const list = [];
  const length = needle.length;
  let from = 0;
  for (;;) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) return list;
    list.push({ start: index, end: index + length });
    from = index + length;
  }
}

function computeMatches(text, query, caseSensitive) {
  if (!query || query.includes('\n')) return [];
  if (caseSensitive) return scan(text, query);
  const lower = lowerOf(text);
  // Lowercasing can change length for rare Unicode; fall back to a per-position
  // match so the offsets still index the original text.
  if (lower.length === text.length) return scan(lower, query.toLowerCase());
  const needle = query.toLowerCase();
  const list = [];
  let from = 0;
  while (from + query.length <= text.length) {
    if (text.slice(from, from + query.length).toLowerCase() === needle) {
      list.push({ start: from, end: from + query.length });
      from += query.length;
    } else {
      from++;
    }
  }
  return list;
}

function nearestIndex(matches, anchor) {
  for (let i = 0; i < matches.length; i++) {
    if (matches[i].start >= anchor) return i;
  }
  return matches.length - 1;
}

export { computeMatches, nearestIndex };
export default initFind;
