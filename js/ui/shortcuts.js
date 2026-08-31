import { evaluateLines } from '../core/calculate.js';
import formatResult from '../render/formatResult.js';

function initShortcuts(editableNode) {
  document.addEventListener('keydown', (event) => {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    const active = document.activeElement;
    if (active && active !== editableNode && active.tagName === 'INPUT') return;
    const shift = event.shiftKey;
    const key = event.key.toLowerCase();

    if (shift && key === 'c') {
      event.preventDefault();
      copyCurrentLineResult(editableNode);
    } else if (shift && key === 'e') {
      event.preventDefault();
      document.getElementById('export-button').click();
    } else if (shift && key === 'i') {
      event.preventDefault();
      document.getElementById('import-button').click();
    } else if (shift && key === 'backspace') {
      event.preventDefault();
      editableNode.value = '';
      editableNode.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}

function copyCurrentLineResult(editableNode) {
  const value = editableNode.value;
  const lineIndex = indexOfLineAt(value, editableNode.selectionStart);
  const { results } = evaluateLines(value.split('\n'));
  const result = results[lineIndex];
  if (result && result.type !== 'error' && result.value !== undefined) {
    navigator.clipboard.writeText(formatResult(result.value));
  }
}

function indexOfLineAt(text, position) {
  let lineIndex = 0;
  for (let i = 0; i < text.length && i < position; i++) {
    if (text[i] === '\n') lineIndex++;
  }
  return lineIndex;
}

export { indexOfLineAt };
export default initShortcuts;
