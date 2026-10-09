// DOM predicates shared by the global keyboard handlers. Pure checks on a
// node — no document lookups — so they stay trivially unit-testable.

/**
 * Whether the focused control expects keyboard input of its own. Global
 * shortcuts (undo, clear sheet, tab switching) must yield to it: a settings
 * `<select>` with a caret-free arrow-key contract, a text field, the rename
 * box, a contenteditable. The editor itself is excluded by the caller, since
 * that is the target these shortcuts are meant for.
 * @param {EventTarget|null} node
 * @returns {boolean}
 */
function isTypingTarget(node) {
  if (!node) return false;
  if (node.isContentEditable) return true;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export { isTypingTarget };
