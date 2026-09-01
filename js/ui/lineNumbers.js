import { indexOfLineAt } from './shortcuts.js';

function initLineNumbers(editableNode) {
  const gutter = document.createElement('pre');
  gutter.className = 'line-numbers';
  editableNode.parentElement.appendChild(gutter);

  let caretIndex = 0;

  // Always number every line contiguously (1..N), plus one phantom line for
  // the row you'd land on after Enter, so numbering never has gaps.
  function render() {
    const lines = editableNode.value.split('\n');
    caretIndex = indexOfLineAt(editableNode.value, editableNode.selectionStart);
    const rowCount = lines.length + 1;
    gutter.textContent = '';
    for (let i = 0; i < rowCount; i++) {
      const span = document.createElement('span');
      span.textContent = i + 1;
      span.dataset.line = i;
      if (i === caretIndex) span.classList.add('active');
      gutter.appendChild(span);
      if (i < rowCount - 1) gutter.appendChild(document.createTextNode('\n'));
    }
  }

  function sync() {
    const index = indexOfLineAt(editableNode.value, editableNode.selectionStart);
    if (index === caretIndex) return;
    caretIndex = index;
    gutter.querySelectorAll('span').forEach((span) => {
      span.classList.toggle('active', Number(span.dataset.line) === index);
    });
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
