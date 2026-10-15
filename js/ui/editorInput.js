// The single way external modules write into the editor. Setting textarea.value
// directly and dispatching input from seven call sites let the tabs store,
// undo history and renderer drift apart; routing every write through one helper
// keeps the "value then caret then input event" contract identical.
function setEditorValue(editableNode, value, caret = null, { separateStep = false } = {}) {
  editableNode.value = value;
  if (caret) {
    editableNode.setSelectionRange(caret.start, caret.end !== undefined ? caret.end : caret.start);
  }
  const event = new Event('input', { bubbles: true });
  // A replace or a clear is its own undo step, not merged with the typing around it.
  event.separateStep = separateStep;
  editableNode.dispatchEvent(event);
}

export { setEditorValue };
