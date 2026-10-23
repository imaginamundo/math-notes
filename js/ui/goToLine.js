// A quick "Go to line" bar, styled like the find bar (it reuses .find-bar's
// visuals) but anchored to the content start. Opened with Cmd/Ctrl+G.
import { t } from '../i18n/index.js';
import { LANGUAGE_UPDATED } from '../util/events.js';

function initGoToLine(editableNode) {
  const barNode = buildBar();
  // Anchored to the editor box, not the scrolling content, so it stays pinned.
  (editableNode.closest('.input') || editableNode.parentElement).appendChild(barNode);

  const inputNode = barNode.querySelector('.go-to-input');
  const countNode = barNode.querySelector('.go-to-count');
  const closeNode = barNode.querySelector('.go-to-close');
  const labelNode = barNode.querySelector('.go-to-label');

  function refreshLabels() {
    barNode.setAttribute('aria-label', t('goto.label'));
    labelNode.textContent = t('goto.label');
    inputNode.setAttribute('aria-label', t('goto.lineNumber'));
    closeNode.title = t('find.close');
    closeNode.setAttribute('aria-label', t('find.close'));
  }
  refreshLabels();
  window.addEventListener(LANGUAGE_UPDATED, refreshLabels);

  function totalLines() {
    return editableNode.value.split('\n').length;
  }

  function lineStart(index) {
    let start = 0;
    for (let i = 0; i < index; i++) start = editableNode.value.indexOf('\n', start) + 1;
    return start;
  }

  function currentLine() {
    const pos = editableNode.selectionStart;
    let line = 0;
    for (let i = 0; i < pos; i++) {
      if (editableNode.value[i] === '\n') line++;
    }
    return line;
  }

  // A line number as typed, including full-width and other script digits (a CJK IME commits
  // `１２`), or NaN when the input is not one.
  function typedLine() {
    return parseInt(inputNode.value.normalize('NFKC'), 10);
  }

  function refresh() {
    const total = totalLines();
    const value = typedLine();
    // Shown as the line it will go to, so 0, -5 and 999 read 1/35, 1/35 and 35/35.
    const shown = Number.isFinite(value) ? Math.min(total, Math.max(1, value)) : '–';
    countNode.textContent = total ? `${shown}/${total}` : '';
  }

  function jump() {
    const total = totalLines();
    const value = typedLine();
    // Not a number: stay where the caret is rather than throw it to line 1.
    if (!Number.isFinite(value)) {
      close();
      return;
    }
    const target = Math.min(total, Math.max(1, value));
    editableNode.focus();
    editableNode.setSelectionRange(lineStart(target - 1), lineStart(target - 1));
    close();
  }

  function open() {
    const next = Math.min(totalLines(), currentLine() + 1);
    inputNode.value = String(next);
    barNode.classList.add('open');
    refresh();
    inputNode.focus();
    inputNode.select();
  }

  function close() {
    if (!barNode.classList.contains('open')) return;
    barNode.classList.remove('open');
    editableNode.focus();
  }

  inputNode.addEventListener('input', refresh);
  inputNode.addEventListener('keydown', (event) => {
    // While an IME is composing, Enter and Esc belong to it.
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      jump();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });
  closeNode.addEventListener('click', close);

  document.addEventListener('keydown', (event) => {
    if (document.querySelector('dialog[open]')) return;
    const mod = event.metaKey || event.ctrlKey;
    if (!mod || event.shiftKey || event.key.toLowerCase() !== 'g') return;
    event.preventDefault();
    if (barNode.classList.contains('open')) {
      inputNode.focus();
      inputNode.select();
      return;
    }
    open();
  });

  return { open, close };
}

function buildBar() {
  const bar = document.createElement('div');
  bar.className = 'find-bar go-to-bar';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Go to line');

  const label = document.createElement('span');
  label.className = 'go-to-label';
  label.textContent = 'Go to line';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'find-field go-to-input';
  input.setAttribute('aria-label', 'Line number');
  input.autocomplete = 'off';
  input.spellcheck = false;

  const count = document.createElement('span');
  count.className = 'find-count go-to-count';
  count.setAttribute('aria-live', 'polite');

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'go-to-close find-close';
  close.textContent = '×';
  close.title = 'Close (Escape)';
  close.setAttribute('aria-label', 'Close (Escape)');

  const row = document.createElement('div');
  row.className = 'find-row';
  row.append(label, input, count, close);
  bar.appendChild(row);
  return bar;
}

export default initGoToLine;
