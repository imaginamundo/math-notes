import formatResult from '../render/formatResult.js';

function initShortcuts(editableNode, requestResults, switchTab) {
  document.addEventListener('keydown', (event) => {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    const active = document.activeElement;
    if (active && active !== editableNode && active.tagName === 'INPUT') return;
    const shift = event.shiftKey;
    const key = event.key.toLowerCase();

    if (key === 'tab' && !event.metaKey) {
      event.preventDefault();
      switchTab({ offset: shift ? -1 : 1 });
    } else if (key >= '1' && key <= '9') {
      event.preventDefault();
      switchTab({ index: parseInt(key, 10) - 1 });
    } else if (shift && key === 'c') {
      event.preventDefault();
      copyCurrentLineResult(editableNode, requestResults);
    } else if (shift && key === 'g') {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('plot:open'));
    } else if (shift && key === 'e') {
      event.preventDefault();
      document.getElementById('export-button').click();
    } else if (shift && key === 'i') {
      event.preventDefault();
      document.getElementById('import-button').click();
    } else if (shift && key === 'backspace') {
      event.preventDefault();
      if (!editableNode.value || window.confirm('Clear the active sheet?')) {
        editableNode.value = '';
        editableNode.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });
}

async function copyCurrentLineResult(editableNode, requestResults) {
  const value = editableNode.value;
  const lineIndex = indexOfLineAt(value, editableNode.selectionStart);
  try {
    const { results } = await requestResults(value.split('\n'));
    const result = results[lineIndex];
    if (result && result.type !== 'error' && result.value !== undefined) {
      copyText(formatResult(result.value));
    }
  } catch {
    // evaluation failed; nothing to copy
  }
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch {
    // clipboard unavailable
  }
  document.body.removeChild(textarea);
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
