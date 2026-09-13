import {
  wordRangeAt,
  suggestionsFor,
  applyCompletion,
  collectAssignments,
  collectTags,
} from '../core/autocomplete.js';
import { VOCABULARY } from '../core/vocabulary.js';
import { setEditorValue } from './editorInput.js';

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
  popup.setAttribute('aria-label', 'Suggestions');
  popup.hidden = true;
  scroller.appendChild(popup);

  let items = [];
  let activeIndex = 0;
  let range = null;
  // Set around an accepted edit so the input event it dispatches does not
  // immediately reopen the popup on the word just inserted.
  let suppress = false;

  function isOpen() {
    return !popup.hidden;
  }

  function blocked() {
    return Boolean(document.querySelector('dialog[open]'));
  }

  function entries() {
    const lines = editableNode.value.split('\n');
    const variables = collectAssignments(lines).map((text) => ({ text, kind: 'variable' }));
    const tags = collectTags(lines).map((text) => ({ text: `#${text}`, kind: 'tag' }));
    return [...variables, ...tags, ...VOCABULARY];
  }

  function refresh(force) {
    if (suppress || blocked()) return close();
    if (editableNode.selectionStart !== editableNode.selectionEnd) return close();
    range = wordRangeAt(editableNode.value, editableNode.selectionStart);
    if (!range) return close();
    // A `#tag` opens after the single `#`; a plain word needs MIN_PREFIX.
    if (!force && !range.tag && range.prefix.length < MIN_PREFIX) return close();
    items = suggestionsFor(range.prefix, entries(), MAX_ITEMS);
    if (!items.length) return close();
    activeIndex = 0;
    render();
    popup.hidden = false;
    position();
  }

  function close() {
    if (popup.hidden) return;
    popup.hidden = true;
    popup.textContent = '';
    items = [];
    range = null;
    editableNode.removeAttribute('aria-activedescendant');
  }

  function render() {
    popup.textContent = '';
    items.forEach((entry, index) => {
      const option = document.createElement('div');
      option.className = 'autocomplete-option' + (index === activeIndex ? ' active' : '');
      option.id = `autocomplete-option-${index}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(index === activeIndex));
      const text = document.createElement('span');
      text.className = 'autocomplete-text';
      text.textContent = entry.text;
      option.appendChild(text);
      if (entry.detail) {
        const detail = document.createElement('span');
        detail.className = 'autocomplete-detail';
        detail.textContent = entry.detail;
        option.appendChild(detail);
      }
      option.addEventListener('mousedown', (event) => {
        event.preventDefault();
        accept(index);
      });
      popup.appendChild(option);
    });
    popup.scrollTop = 0;
    setActiveDescendant();
  }

  function move(delta) {
    activeIndex = (activeIndex + delta + items.length) % items.length;
    [...popup.children].forEach((child, index) => {
      child.classList.toggle('active', index === activeIndex);
      child.setAttribute('aria-selected', String(index === activeIndex));
    });
    setActiveDescendant();
    revealActive();
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
    const next = applyCompletion(editableNode.value, range, entry.text, {
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
    popup.style.left = `${caret.left}px`;
    const below = caret.top + caret.lineHeight;
    popup.style.top = `${below}px`;
    const viewTop = scroller.scrollTop;
    const viewBottom = viewTop + scroller.clientHeight;
    if (below + popup.offsetHeight > viewBottom) {
      popup.style.top = `${Math.max(viewTop, caret.top - popup.offsetHeight)}px`;
    }
  }

  editableNode.addEventListener('input', () => refresh(false));
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
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      event.stopImmediatePropagation();
      accept();
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
