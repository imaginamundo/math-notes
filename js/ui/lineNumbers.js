import { indexOfLineAt } from './shortcuts.js';

function initLineNumbers(editableNode) {
  const gutter = document.createElement('pre');
  gutter.className = 'line-numbers';
  editableNode.parentElement.appendChild(gutter);

  const rows = [];
  let caretIndex = 0;

  // Always number every line contiguously (1..N), plus one phantom line for
  // the row you'd land on after Enter, so numbering never has gaps. Rows are
  // reused across renders, so typing only adds or removes the delta.
  function render() {
    const lines = editableNode.value.split('\n');
    caretIndex = indexOfLineAt(editableNode.value, editableNode.selectionStart);
    const rowCount = lines.length + 1;
    while (rows.length < rowCount) {
      const span = document.createElement('span');
      span.textContent = rows.length + 1;
      span.dataset.line = rows.length;
      if (rows.length > 0) gutter.appendChild(document.createTextNode('\n'));
      gutter.appendChild(span);
      rows.push(span);
    }
    while (rows.length > rowCount) {
      const span = rows.pop();
      const separator = span.previousSibling;
      span.remove();
      if (separator && separator.nodeType === 3) separator.remove();
    }
    rows.forEach((span, i) => span.classList.toggle('active', i === caretIndex));
  }

  function sync() {
    const index = indexOfLineAt(editableNode.value, editableNode.selectionStart);
    if (index === caretIndex) return;
    caretIndex = index;
    rows.forEach((span, i) => span.classList.toggle('active', i === index));
  }

  editableNode.addEventListener('scroll', () => {
    gutter.scrollTop = editableNode.scrollTop;
  });
  editableNode.addEventListener('input', render);
  editableNode.addEventListener('keyup', sync);
  editableNode.addEventListener('click', sync);

  render();
  gutter.scrollTop = editableNode.scrollTop;
}

export default initLineNumbers;
