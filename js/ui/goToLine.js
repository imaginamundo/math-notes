// A quick "Go to line" bar, styled like the find bar (it reuses .find-bar's
// visuals) but anchored to the content start. Opened with Cmd/Ctrl+G.
function initGoToLine(editableNode) {
  const barNode = buildBar();
  editableNode.parentElement.appendChild(barNode);

  const inputNode = barNode.querySelector('.go-to-input');
  const countNode = barNode.querySelector('.go-to-count');
  const closeNode = barNode.querySelector('.go-to-close');

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

  function refresh() {
    const total = totalLines();
    const value = parseInt(inputNode.value, 10);
    countNode.textContent = total ? `${Number.isFinite(value) ? value : '–'}/${total}` : '';
  }

  function jump() {
    const total = totalLines();
    const target = Math.min(total, Math.max(1, parseInt(inputNode.value, 10) || 1));
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
    if (document.body.classList.contains('tour-open')) return;
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
