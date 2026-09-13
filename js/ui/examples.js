import { scrollEditorToEnd } from '../util/scroll.js';
import { setEditorValue } from './editorInput.js';
import { indentGroupBodies } from '../render/exampleText.js';
import format from '../render/format.js';
import { collectVariableNames } from '../core/multiWordVariables.js';
import { t } from '../i18n/index.js';

// Render an example into the chip's <code>, reusing the app's highlighter so the
// tokens carry the same colours as the editor. Multi-line examples also get a
// numbered gutter, like the editor's, so blocks (groups) read clearly; a
// one-line example keeps a lone content row with no number.
function renderCode(codeNode, expr) {
  const lines = expr.split('\n');
  const names = collectVariableNames(lines);
  const numbered = lines.length > 1;
  codeNode.textContent = '';
  lines.forEach((line, index) => {
    const row = document.createElement('span');
    row.className = 'help-line';
    if (numbered) {
      const gutter = document.createElement('span');
      gutter.className = 'help-line-number';
      gutter.setAttribute('aria-hidden', 'true');
      gutter.textContent = String(index + 1);
      row.appendChild(gutter);
    }
    const content = document.createElement('span');
    content.className = 'help-line-content';
    content.appendChild(format.line(line, names));
    row.appendChild(content);
    codeNode.appendChild(row);
  });
}

// Wires up clickable example chips: fills the <code> from data-expr (with group
// bodies indented and highlighted), inserts the expression into the editor on
// click/Enter/Space, then runs onInsert.
function initExamples(containerNode, editableNode, onInsert) {
  const title = t('help.exampleTitle');
  containerNode.querySelectorAll('.help-example').forEach((example) => {
    const expr = indentGroupBodies(example.dataset.expr);
    const codeNode = example.querySelector('code');
    if (codeNode) renderCode(codeNode, expr);
    example.title = title;
    example.setAttribute('aria-label', title);

    const run = () => {
      insertExample(editableNode, expr);
      if (onInsert) onInsert();
    };
    example.addEventListener('click', run);
    example.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        run();
      }
    });
  });
}

function insertExample(editableNode, expression) {
  if (!expression) return;
  const current = editableNode.value;
  const value = current ? current.replace(/\s+$/, '') + '\n' + expression : expression;
  setEditorValue(editableNode, value);
  scrollEditorToEnd(editableNode);
}

export default initExamples;
