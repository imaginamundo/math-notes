// Scroll the editor's scroll container to the bottom after content is
// inserted below the fold (imports, recipe examples).
function scrollEditorToEnd(editableNode) {
  const scroller = editableNode.closest('.editor-scroll');
  if (scroller) scroller.scrollTop = scroller.scrollHeight;
}

export { scrollEditorToEnd };
