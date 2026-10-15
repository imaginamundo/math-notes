import { t } from '../i18n/index.js';
import { ungroupDisplay } from '../core/numberGrouping.js';
import formatResult from '../render/formatResult.js';
import { getDecimalPrecision } from '../core/decimalPrecision.js';
import { getClockFormat } from '../core/clockFormat.js';
import { indexOfLineAt } from '../util/text.js';
import { copyText } from '../util/clipboard.js';
import { isTypingTarget } from '../util/dom.js';
import { setEditorValue } from './editorInput.js';
import { SHARE_COPY } from '../util/events.js';

function initShortcuts(editableNode, requestResults, switchTab) {
  document.addEventListener('keydown', (event) => {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    if (document.querySelector('dialog[open]')) return;
    const active = document.activeElement;
    // Anything but the editor that takes the keyboard — a field, a select,
    // contenteditable — keeps these combinations for itself.
    if (active && active !== editableNode && isTypingTarget(active)) return;
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
    } else if (shift && (key === 's' || key === 'l')) {
      // Both, because Firefox reserves Ctrl+Shift+S for its own devtools and
      // a page cannot intercept it there. L is for "link".
      event.preventDefault();
      document.dispatchEvent(new CustomEvent(SHARE_COPY));
    } else if (shift && key === 'e') {
      event.preventDefault();
      document.getElementById('export-button').click();
    } else if (shift && key === 'i') {
      event.preventDefault();
      document.getElementById('import-button').click();
    } else if (shift && key === 'backspace') {
      event.preventDefault();
      if (!editableNode.value || window.confirm(t('shortcuts.clearConfirm'))) {
        setEditorValue(editableNode, '');
      }
    }
  });
}

async function copyCurrentLineResult(editableNode, requestResults) {
  const value = editableNode.value;
  const lineIndex = indexOfLineAt(value, editableNode.selectionStart);
  try {
    // Give up rather than write seconds later over whatever was copied in between.
    const { results } = await Promise.race([
      requestResults(value.split('\n')),
      new Promise((_, reject) => setTimeout(() => reject(new Error('copy timed out')), 3000)),
    ]);
    // The sheet or the caret moved while waiting: that result is no longer the current line's.
    if (
      editableNode.value !== value ||
      indexOfLineAt(editableNode.value, editableNode.selectionStart) !== lineIndex
    ) {
      return;
    }
    const result = results[lineIndex];
    if (result && result.type !== 'error' && result.value !== undefined) {
      // Without the thousands separators, so pasting it back reads as the same number.
      const shown = formatResult(result.value, getDecimalPrecision(), getClockFormat());
      await copyText(ungroupDisplay(shown));
    }
  } catch {
    // evaluation failed; nothing to copy
  }
}

export default initShortcuts;
