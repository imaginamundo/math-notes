// Pure tab-state reducers. No DOM or storage: every function returns a new
// TabState and leaves the input untouched, so the collection logic is
// unit-testable without a document (js/ui/tabs.js wires it to the UI).

/**
 * @typedef {{ id: string, name: string, content: string, caret: {start: number, end: number}|null }} Tab
 * @typedef {{ tabs: Tab[], activeId: string|null, nextTabNumber: number }} TabState
 */

function generateId() {
  return 'tab-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createTab(prev, name) {
  const tab = { id: generateId(), name, content: '', caret: null };
  return {
    ...prev,
    tabs: [...prev.tabs, tab],
    activeId: tab.id,
    nextTabNumber: prev.nextTabNumber + 1,
  };
}

function closeTab(prev, id) {
  const index = prev.tabs.findIndex((tab) => tab.id === id);
  if (index === -1) return prev;
  const tabs = prev.tabs.filter((tab) => tab.id !== id);
  let activeId = prev.activeId;
  if (activeId === id) {
    const next = tabs[Math.min(index, tabs.length - 1)];
    activeId = next ? next.id : null;
  }
  return { ...prev, tabs, activeId };
}

function renameTab(prev, id, name) {
  return { ...prev, tabs: prev.tabs.map((tab) => (tab.id === id ? { ...tab, name } : tab)) };
}

function setActiveTab(prev, id) {
  return prev.activeId === id ? prev : { ...prev, activeId: id };
}

function setContent(prev, id, content) {
  return { ...prev, tabs: prev.tabs.map((tab) => (tab.id === id ? { ...tab, content } : tab)) };
}

// Trust a stored caret only when it is a pair of integers inside the content;
// anything else (a corrupt value, an old schema, a shrunken sheet) is ignored
// so restoring it can never throw or move the caret out of range.
function normalizeCaret(caret, length) {
  if (!caret || typeof caret !== 'object') return null;
  const start = caret.start;
  const end = caret.end === undefined ? caret.start : caret.end;
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  if (start < 0 || end < 0 || start > length || end > length) return null;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

function sameCaret(a, b) {
  if (!a || !b) return a === b;
  return a.start === b.start && a.end === b.end;
}

function setCaret(prev, id, caret) {
  let changed = false;
  const tabs = prev.tabs.map((tab) => {
    if (tab.id !== id || sameCaret(tab.caret, caret)) return tab;
    changed = true;
    return { ...tab, caret };
  });
  return changed ? { ...prev, tabs } : prev;
}

function moveTab(prev, id, toIndex) {
  const fromIndex = prev.tabs.findIndex((tab) => tab.id === id);
  if (fromIndex === -1 || fromIndex === toIndex) return prev;
  const tabs = [...prev.tabs];
  const [moved] = tabs.splice(fromIndex, 1);
  tabs.splice(toIndex, 0, moved);
  return { ...prev, tabs };
}

// The next auto-numbered tab name must not collide with an existing one.
function deriveNextTabNumber(tabs) {
  let next = tabs.length + 1;
  for (const tab of tabs) {
    const match = /^Tab (\d+)$/.exec(tab.name);
    if (match) next = Math.max(next, parseInt(match[1], 10) + 1);
  }
  return next;
}

export {
  generateId,
  createTab,
  closeTab,
  renameTab,
  setActiveTab,
  setContent,
  setCaret,
  normalizeCaret,
  moveTab,
  deriveNextTabNumber,
};
