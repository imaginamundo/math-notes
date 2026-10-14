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

// Merge the latest snapshot of each tab into the open collection, for "Restore
// all" and for rebuilding after unreadable storage. A snapshot only supplies a
// tab's name and content: the tabs that are open stay, in their order and with
// their active tab, even when they have no snapshot (a tab the app filled in and
// the user never typed in has none). Snapshots of tabs that are no longer open
// are appended in their original order, by recorded position and then age.
// `dropPristine` removes a still-empty tab with no snapshot, which is how an
// unreadable collection looks after the app wrote a fresh one over it.
function mergeSnapshots(state, snapshots, { dropPristine = false } = {}) {
  const byTab = new Map(snapshots.map((snapshot) => [snapshot.tabId, snapshot]));
  const open = new Set(state.tabs.map((tab) => tab.id));
  const restored = state.tabs.map((tab) => {
    const snapshot = byTab.get(tab.id);
    return snapshot ? { ...tab, name: snapshot.name, content: snapshot.content, caret: null } : tab;
  });
  const missing = snapshots
    .filter((snapshot) => !open.has(snapshot.tabId))
    .sort((a, b) => {
      const positionA = Number.isInteger(a.position) ? a.position : Infinity;
      const positionB = Number.isInteger(b.position) ? b.position : Infinity;
      return positionA - positionB || a.timestamp - b.timestamp;
    })
    .map((snapshot) => ({
      id: snapshot.tabId || generateId(),
      name: snapshot.name,
      content: snapshot.content,
      caret: null,
    }));

  let tabs = [...restored, ...missing];
  if (dropPristine) {
    const kept = tabs.filter((tab) => tab.content !== '' || byTab.has(tab.id));
    if (kept.length > 0) tabs = kept;
  }
  const activeId = tabs.some((tab) => tab.id === state.activeId)
    ? state.activeId
    : (tabs[0] && tabs[0].id) || state.activeId;
  return { ...state, tabs, activeId, nextTabNumber: deriveNextTabNumber(tabs) };
}

// The snapshots that hold work the saved collection does not: saved after the
// collection was, and either for a tab it never recorded or with different text.
// This is what is left after a localStorage write fails (quota, blocked storage):
// the collection stays at its last successful write while snapshots, which live
// in IndexedDB, keep up. Compared by content as well as time because a snapshot is
// normally saved a moment after the collection and is newer without being different.
// `savedAt` is when the collection was saved, or null when it never said, in which
// case nothing can be concluded and nothing is returned.
function newerSnapshots(state, snapshots, savedAt) {
  if (!Number.isFinite(savedAt)) return [];
  const newest = new Map();
  for (const snapshot of snapshots) {
    const known = newest.get(snapshot.tabId);
    if (!known || snapshot.timestamp > known.timestamp) newest.set(snapshot.tabId, snapshot);
  }
  const contents = new Map(state.tabs.map((tab) => [tab.id, tab.content]));
  return [...newest.values()].filter(
    (snapshot) =>
      snapshot.timestamp > savedAt &&
      (!contents.has(snapshot.tabId) || contents.get(snapshot.tabId) !== snapshot.content)
  );
}

export {
  newerSnapshots,
  mergeSnapshots,
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
