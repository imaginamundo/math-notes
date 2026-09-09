// The single way external modules write into the editor. Setting textarea.value
// directly and dispatching input from seven call sites let the tabs store,
// undo history and renderer drift apart; routing every write through one helper
// keeps the "value then caret then input event" contract identical.
function setEditorValue(editableNode, value, caret = null) {
  editableNode.value = value;
  if (caret) {
    editableNode.setSelectionRange(caret.start, caret.end !== undefined ? caret.end : caret.start);
  }
  editableNode.dispatchEvent(new Event('input', { bubbles: true }));
}

export { setEditorValue };
