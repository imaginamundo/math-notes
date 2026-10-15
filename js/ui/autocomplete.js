import {
  wordRangeAt,
  suggestionsFor,
  applyCompletion,
  suggestionFacts,
  suggestionsFrom,
} from '../core/autocomplete.js';
import { VOCABULARY } from '../core/vocabulary.js';
import { setEditorValue } from './editorInput.js';
import { sheetLines } from '../util/text.js';
import { t } from '../i18n/index.js';
import { LANGUAGE_UPDATED } from '../util/events.js';

// A caret-anchored suggestion popup. It opens while a word is being typed (at
// least MIN_PREFIX characters) and on Ctrl/Cmd+Space, completes variables and
// `#tags` from the sheet plus the curated vocabulary, and inserts the choice as
// a normal edit (through setEditorValue, so undo and the renderer stay in sync).
// A leading `#` switches it to tag mode and opens after the single character.
//
// Its keydown listener must be registered before the Tab handling in
// js/ui/indent.js: when the popup is open it swallows the keys it uses with
// stopImmediatePropagation, so Tab accepts instead of indenting.
const MIN_PREFIX = 2;
const MAX_ITEMS = 8;

function initAutocomplete(editableNode, editorScroll) {
  const scroller = editableNode.closest('.editor-scroll');
  if (!scroller) return {};

  const popup = document.createElement('div');
  popup.className = 'autocomplete';
  popup.id = 'autocomplete-list';
  popup.setAttribute('role', 'listbox');
  popup.setAttribute('aria-label', t('autocomplete.label'));
  popup.hidden = true;
  scroller.appendChild(popup);
  // The editor stays a plain multiline textbox: ARIA-in-HTML does not allow
  // `combobox` on a textarea, and re-roling it would cost screen readers the
  // textbox semantics. It only points at the listbox and says it autocompletes;
  // what the popup holds is announced through the status region below.
  editableNode.setAttribute('aria-controls', 'autocomplete-list');
  editableNode.setAttribute('aria-autocomplete', 'list');
  // Outside the popup, so it outlives the popup's `hidden`, and outside the
  // scroll container, so it cannot affect scrolling. Same pattern as the result
  // announcer in js/render/renderInput.js.
  const status = document.createElement('span');
  status.className = 'sr-only autocomplete-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  document.body.appendChild(status);
  window.addEventListener(LANGUAGE_UPDATED, () =>
    popup.setAttribute('aria-label', t('autocomplete.label'))
  );

  let items = [];
  let activeIndex = 0;
  let range = null;
  // Whether the user chose to look at the suggestions: they opened the popup with
  // Ctrl+Space or moved the highlight with the arrow keys. A popup that opened by
  // itself while typing is only offered, so Enter must not take it: at the end of
  // a line it would swap a complete word for a longer one (`grams` for `kilograms`).
  let chosen = false;
  // Set around an accepted edit so the input event it dispatches does not
  // immediately reopen the popup on the word just inserted.
  let suppress = false;

  function isOpen() {
    return !popup.hidden;
  }

  function blocked() {
    return Boolean(document.querySelector('dialog[open]'));
  }

  // Suggestions come from every assignment and tag in the sheet, so building
  // them means parsing every line. The parsed facts are kept line by line, so
  // an edit re-parses only the lines it touched: a keystroke in a
  // thousand-line sheet costs one line instead of four parses of each, and
  // inserting a line costs one parse, not one per line below it. On top of
  // that, a change that cannot add or remove a name (`=` or `#` is what
  // can) reuses the whole list.
  let cachedValue = null;
  let cachedCaretLine = -1;
  let cachedLines = null;
  let cachedEntries = null;
  // Facts by line text: they depend on nothing but the line, so a line that
  // moved (Enter near the top shifts every line below it) is still found.
  let factsByLine = new Map();

  function couldAffectEntries(line) {
    return line.includes('=') || line.includes('#');
  }

  // Names are offered only where they can be used: a variable, function or unit is
  // defined by a line above the caret's, so a name assigned below is not offered.
  // Tags are offered from anywhere, since a tag can be new on the line being typed.
  function entries() {
    const value = editableNode.value;
    const caretLine = value.slice(0, editableNode.selectionStart).split('\n').length - 1;
    if (value === cachedValue && caretLine === cachedCaretLine && cachedEntries) {
      return cachedEntries;
    }

    const lines = sheetLines(value);
    if (
      cachedEntries &&
      cachedLines &&
      caretLine === cachedCaretLine &&
      lines.length === cachedLines.length
    ) {
      let relevant = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === cachedLines[i]) continue;
        if (couldAffectEntries(lines[i]) || couldAffectEntries(cachedLines[i])) {
          relevant = true;
          break;
        }
      }
      if (!relevant) {
        cachedValue = value;
        cachedLines = lines;
        return cachedEntries;
      }
    }

    const next = new Map();
    for (const line of lines) {
      if (!next.has(line)) next.set(line, factsByLine.get(line) || suggestionFacts(line));
    }
    factsByLine = next;
    cachedValue = value;
    cachedCaretLine = caretLine;
    cachedLines = lines;
    const facts = lines.map((line) => next.get(line));
    const above = suggestionsFrom(facts.slice(0, caretLine));
    const known = new Set(above.map((entry) => entry.text));
    const tagsBelow = suggestionsFrom(facts.slice(caretLine)).filter(
      (entry) => entry.kind === 'tag' && !known.has(entry.text)
    );
    cachedEntries = [...above, ...tagsBelow, ...VOCABULARY];
    return cachedEntries;
  }

  function refresh(force) {
    if (suppress) return close();
    if (editableNode.selectionStart !== editableNode.selectionEnd) return close();
    range = wordRangeAt(editableNode.value, editableNode.selectionStart);
    if (!range) return close();
    // A `#tag` opens after the single `#`; a plain word needs MIN_PREFIX.
    if (!force && !range.tag && range.prefix.length < MIN_PREFIX) return close();
    // A dialog in front means no popup at all; asked for last, so the document
    // search it costs only happens for a word that would otherwise open one.
    if (blocked()) return close();
    const all = entries();
    // A word that already names something needs no help: offering longer words
    // for it only invites replacing it. Ctrl+Space still lists them.
    if (!force && isKnown(range.prefix, all)) return close();
    items = suggestionsFor(range.prefix, all, MAX_ITEMS, {
      before: editableNode.value.slice(0, range.start),
    });
    if (!items.length) return close();
    activeIndex = 0;
    chosen = Boolean(force);
    render();
    popup.hidden = false;
    announce(countMessage());
    position();
  }

  function isKnown(prefix, all) {
    // The tag being typed is already a tag of the sheet, so it would always be
    // "known"; a tag has no vocabulary of its own to be complete against.
    if (prefix.startsWith('#')) return false;
    const lower = prefix.toLowerCase();
    return all.some((entry) => entry.text.toLowerCase() === lower);
  }

  function close() {
    chosen = false;
    if (popup.hidden) return;
    popup.hidden = true;
    popup.textContent = '';
    items = [];
    range = null;
    editableNode.removeAttribute('aria-activedescendant');
    announce('');
  }

  function announce(text) {
    if (status.textContent !== text) status.textContent = text;
  }

  function countMessage() {
    return t(items.length === 1 ? 'autocomplete.one' : 'autocomplete.count', {
      count: items.length,
    });
  }

  // One option row per position, created once and then updated in place:
  // rebuilding all eight on every keystroke was the largest remaining cost of
  // typing inside a word once the parser stopped being the bottleneck.
  function optionAt(index) {
    const existing = popup.children[index];
    if (existing) return existing;
    const option = document.createElement('div');
    option.className = 'autocomplete-option';
    option.id = `autocomplete-option-${index}`;
    option.setAttribute('role', 'option');
    const text = document.createElement('span');
    text.className = 'autocomplete-text';
    option.appendChild(text);
    option.addEventListener('mousedown', (event) => {
      event.preventDefault();
      accept(index);
    });
    popup.appendChild(option);
    return option;
  }

  function render() {
    while (popup.children.length > items.length) popup.lastChild.remove();
    items.forEach((entry, index) => {
      const option = optionAt(index);
      const text = option.firstChild;
      if (text.textContent !== entry.text) text.textContent = entry.text;
      const detail = option.children[1];
      if (entry.detail) {
        const span = detail || option.appendChild(document.createElement('span'));
        span.className = 'autocomplete-detail';
        if (span.textContent !== entry.detail) span.textContent = entry.detail;
      } else if (detail) {
        detail.remove();
      }
      option.classList.toggle('active', index === activeIndex);
      option.setAttribute('aria-selected', String(index === activeIndex));
    });
    popup.scrollTop = 0;
    setActiveDescendant();
  }

  function move(delta) {
    chosen = true;
    activeIndex = (activeIndex + delta + items.length) % items.length;
    [...popup.children].forEach((child, index) => {
      child.classList.toggle('active', index === activeIndex);
      child.setAttribute('aria-selected', String(index === activeIndex));
    });
    setActiveDescendant();
    revealActive();
    // `aria-activedescendant` on a textbox is not reliably announced, so say
    // the highlighted suggestion and where it sits.
    announce(
      t('autocomplete.position', {
        text: items[activeIndex].text,
        index: activeIndex + 1,
        count: items.length,
      })
    );
  }

  // Keep the highlighted option inside the popup's own scroll area. `offsetTop`
  // is measured from the popup (its positioned ancestor) and ignores its scroll,
  // so it compares directly against scrollTop/clientHeight.
  function revealActive() {
    const option = popup.children[activeIndex];
    if (!option) return;
    const top = option.offsetTop;
    if (top < popup.scrollTop) popup.scrollTop = top;
    else if (top + option.offsetHeight > popup.scrollTop + popup.clientHeight) {
      popup.scrollTop = top + option.offsetHeight - popup.clientHeight;
    }
  }

  function setActiveDescendant() {
    editableNode.setAttribute('aria-activedescendant', `autocomplete-option-${activeIndex}`);
  }

  function accept(index = activeIndex) {
    const entry = items[index];
    if (!entry || !range) return close();
    // Recompute from the live caret: the popup can stay open while the caret
    // moves (Home/End, arrow keys, a tab switch), and the stored range would
    // then rewrite the wrong word.
    const live = wordRangeAt(editableNode.value, editableNode.selectionStart);
    if (!live || live.start !== range.start) return close();
    const next = applyCompletion(editableNode.value, live, entry.text, {
      paren: entry.kind === 'function',
    });
    suppress = true;
    setEditorValue(editableNode, next.value, { start: next.caret, end: next.caret });
    suppress = false;
    close();
  }

  // Sit under the caret, flipping above it when there is no room below.
  function position() {
    if (typeof editorScroll.caretPosition !== 'function') return;
    const caret = editorScroll.caretPosition();
    if (!caret) return;
    // Keep the popup inside the visible width: with the editor scrolled sideways, the caret can
    // sit at the very edge and the popup would show only a sliver.
    const viewLeft = scroller.scrollLeft;
    const room = scroller.clientWidth - popup.offsetWidth - 8;
    popup.style.left = `${Math.max(viewLeft + 4, Math.min(caret.left, viewLeft + room))}px`;
    const below = caret.top + caret.lineHeight;
    popup.style.top = `${below}px`;
    const viewTop = scroller.scrollTop;
    const viewBottom = viewTop + scroller.clientHeight;
    if (below + popup.offsetHeight > viewBottom) {
      popup.style.top = `${Math.max(viewTop, caret.top - popup.offsetHeight)}px`;
    }
  }

  editableNode.addEventListener('input', () => refresh(false));
  // The popup follows the word it opened on; if the caret leaves that word
  // (arrow keys, Home/End, a tab switch), close it rather than complete stale.
  document.addEventListener('selectionchange', () => {
    if (!isOpen() || document.activeElement !== editableNode) return;
    const live = wordRangeAt(editableNode.value, editableNode.selectionStart);
    if (!live || live.start !== range.start) close();
  });
  editableNode.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    const mod = event.metaKey || event.ctrlKey;
    if (mod && (event.key === ' ' || event.code === 'Space')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      refresh(true);
      return;
    }
    if (!isOpen()) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopImmediatePropagation();
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Tab' || (event.key === 'Enter' && chosen)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      accept();
    } else if (event.key === 'Enter') {
      // Not chosen: the popup steps aside and Enter is an ordinary line break.
      close();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  });
  editableNode.addEventListener('click', close);
  editableNode.addEventListener('blur', close);
  scroller.addEventListener('scroll', () => {
    if (isOpen()) position();
  });

  return { isOpen, close, refresh };
}

export default initAutocomplete;
