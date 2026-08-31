// Wires up clickable example chips: fills the <code> from data-expr, inserts
// the expression into the editor on click/Enter/Space, then runs onInsert.
function initExamples(containerNode, editableNode, onInsert) {
  containerNode.querySelectorAll('.help-example').forEach((example) => {
    const codeNode = example.querySelector('code');
    if (codeNode) codeNode.textContent = example.dataset.expr;

    const run = () => {
      insertExample(editableNode, example.dataset.expr);
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
  editableNode.value = current ? current.replace(/\s+$/, '') + '\n' + expression : expression;
  editableNode.dispatchEvent(new Event('input', { bubbles: true }));
  editableNode.scrollTop = editableNode.scrollHeight;
}

export default initExamples;
