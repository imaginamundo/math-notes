import { scrollEditorToEnd } from '../util/scroll.js';
import { setEditorValue } from './editorInput.js';
import { indentGroupBodies } from '../render/exampleText.js';
import { t } from '../i18n/index.js';

// Wires up clickable example chips: fills the <code> from data-expr (with group
// bodies indented for readability), inserts the expression into the editor on
// click/Enter/Space, then runs onInsert.
function initExamples(containerNode, editableNode, onInsert) {
  const title = t('help.exampleTitle');
  containerNode.querySelectorAll('.help-example').forEach((example) => {
    const expr = indentGroupBodies(example.dataset.expr);
    const codeNode = example.querySelector('code');
    if (codeNode) codeNode.textContent = expr;
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
