import { saveSnapshot, latestPerTab } from '../storage/snapshots.js';

const STORAGE_KEY = 'math-notes-tabs';
const LEGACY_KEY = 'input';
const HISTORY_LIMIT = 100;
const SNAPSHOT_DELAY = 2000;

let state = null;
let persistTimer = null;

// Per-tab undo/redo history, kept in memory only (not persisted). Each entry is
// { undo: string[], redo: string[], draft: string | null } where `draft` is the
// value captured at the start of the current typing burst.
const histories = new Map();

function emptyHistory() {
  return { undo: [], redo: [], draft: null };
}

// A new edit begins a burst: record the pre-burst value as the draft and drop
// the redo stack (a new edit invalidates redo).
function recordChange(entry, lastValue, newValue) {
  if (newValue === lastValue) return entry;
  if (entry.draft === null) {
    return { ...entry, draft: lastValue, redo: [] };
  }
  return entry;
}

// End a burst: the draft becomes the undo boundary for the whole burst.
function commitDraft(entry) {
  if (entry.draft === null) return entry;
  return { undo: [...entry.undo, entry.draft].slice(-HISTORY_LIMIT), redo: [], draft: null };
}

function applyUndo(entry, current) {
  if (!entry.undo.length) return null;
  return {
    entry: { ...entry, undo: entry.undo.slice(0, -1), redo: [...entry.redo, current] },
    value: entry.undo[entry.undo.length - 1],
  };
}

function applyRedo(entry, current) {
  if (!entry.redo.length) return null;
  return {
    entry: { ...entry, undo: [...entry.undo, current], redo: entry.redo.slice(0, -1) },
    value: entry.redo[entry.redo.length - 1],
  };
}

function writeState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable
  }
}

function persist() {
  clearTimeout(persistTimer);
  persistTimer = null;
  writeState();
}

function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(writeState, 400);
}

function generateId() {
  return 'tab-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createTab(prev, name) {
  const tab = { id: generateId(), name, content: '' };
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

let storageFailed = false;

function loadInitialState() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    // storage unavailable or malformed, fall back to the null default
    storageFailed = true;
  }
  if (saved && Array.isArray(saved.tabs) && saved.tabs.length) {
    return { ...saved, nextTabNumber: saved.nextTabNumber || saved.tabs.length + 1 };
  }
  let content = '';
  try {
    content = localStorage.getItem(LEGACY_KEY) || '';
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // storage unavailable
  }
  const tab = { id: generateId(), name: 'Tab 1', content };
  return { tabs: [tab], activeId: tab.id, nextTabNumber: 2 };
}

function initTabs(editableNode, onUpdate) {
  const tabBarNode = document.getElementById('tabs-bar');
  state = loadInitialState();
  persist();

  const getActiveTab = () => state.tabs.find((tab) => tab.id === state.activeId) || state.tabs[0];

  let lastValue = getActiveTab().content;
  let burstTimer = null;
  let snapshotTimer = null;

  const history = () => {
    let entry = histories.get(state.activeId);
    if (!entry) {
      entry = emptyHistory();
      histories.set(state.activeId, entry);
    }
    return entry;
  };

  function saveActiveSnapshot() {
    const tab = getActiveTab();
    if (!tab) return;
    saveSnapshot({ id: tab.id, name: tab.name, content: tab.content }).catch(() => {});
  }

  function scheduleSnapshot() {
    clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(saveActiveSnapshot, SNAPSHOT_DELAY);
  }

  function flushSnapshot() {
    clearTimeout(snapshotTimer);
    snapshotTimer = null;
    saveActiveSnapshot();
  }

  function flushDraft() {
    clearTimeout(burstTimer);
    burstTimer = null;
    histories.set(state.activeId, commitDraft(history()));
  }

  function setValue(value) {
    lastValue = value;
    editableNode.value = value;
    state = setContent(state, state.activeId, value);
    persist();
    scheduleSnapshot();
    editableNode.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function undo() {
    flushDraft();
    const result = applyUndo(history(), lastValue);
    if (!result) return;
    histories.set(state.activeId, result.entry);
    setValue(result.value);
  }

  function redo() {
    flushDraft();
    const result = applyRedo(history(), lastValue);
    if (!result) return;
    histories.set(state.activeId, result.entry);
    setValue(result.value);
  }

  editableNode.value = lastValue;

  editableNode.addEventListener('input', () => {
    const value = editableNode.value;
    if (value === lastValue) return;
    const entry = recordChange(history(), lastValue, value);
    histories.set(state.activeId, entry);
    lastValue = value;
    clearTimeout(burstTimer);
    burstTimer = setTimeout(() => {
      histories.set(state.activeId, commitDraft(history()));
    }, 700);
    state = setContent(state, state.activeId, value);
    schedulePersist();
    scheduleSnapshot();
  });

  const flushPersist = () => {
    if (persistTimer !== null) {
      clearTimeout(persistTimer);
      persistTimer = null;
      writeState();
    }
  };
  const flushAll = () => {
    flushDraft();
    flushPersist();
    flushSnapshot();
  };
  editableNode.addEventListener('blur', flushAll);
  window.addEventListener('pagehide', flushAll);

  document.addEventListener('keydown', (event) => {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    const key = event.key.toLowerCase();
    if (key !== 'z' && key !== 'y') return;
    const active = document.activeElement;
    if (active && active !== editableNode && active.tagName === 'INPUT') return;
    if (document.querySelector('dialog[open]')) return;
    event.preventDefault();
    if (event.shiftKey || key === 'y') redo();
    else undo();
  });

  function render() {
    tabBarNode.innerHTML = '';
    tabBarNode.setAttribute('role', 'tablist');
    tabBarNode.setAttribute('aria-label', 'Worksheets');
    state.tabs.forEach((tab) => tabBarNode.appendChild(renderTab(tab)));
    tabBarNode.appendChild(renderNewButton());
  }

  function renderTab(tab) {
    const active = tab.id === state.activeId;
    const tabNode = document.createElement('div');
    tabNode.className = 'tab' + (active ? ' active' : '');
    tabNode.dataset.id = tab.id;
    tabNode.setAttribute('role', 'tab');
    tabNode.setAttribute('aria-selected', String(active));
    tabNode.tabIndex = active ? 0 : -1;

    const nameNode = document.createElement('span');
    nameNode.className = 'tab-name';
    nameNode.textContent = tab.name;
    nameNode.title = 'Double-click to rename';

    const closeNode = document.createElement('button');
    closeNode.className = 'tab-close';
    closeNode.textContent = '×';
    closeNode.title = 'Close tab';

    tabNode.appendChild(nameNode);
    tabNode.appendChild(closeNode);
    return tabNode;
  }

  function renderNewButton() {
    const button = document.createElement('button');
    button.className = 'tab-new';
    button.textContent = '+';
    button.title = 'New tab';
    return button;
  }

  function activate(id) {
    if (state.activeId === id) {
      editableNode.focus();
      return;
    }
    flushDraft();
    flushSnapshot();
    state = setContent(state, state.activeId, editableNode.value);
    state = setActiveTab(state, id);
    const tab = state.tabs.find((entry) => entry.id === id);
    editableNode.value = tab.content;
    lastValue = tab.content;
    persist();
    render();
    onUpdate();
    editableNode.dispatchEvent(new Event('input', { bubbles: true }));
    editableNode.focus();
  }

  function handleNew() {
    flushDraft();
    flushSnapshot();
    state = setContent(state, state.activeId, editableNode.value);
    state = createTab(state, 'Tab ' + state.nextTabNumber);
    editableNode.value = '';
    lastValue = '';
    persist();
    render();
    onUpdate();
    editableNode.dispatchEvent(new Event('input', { bubbles: true }));
    editableNode.focus();
  }

  function handleClose(id) {
    const tab = state.tabs.find((entry) => entry.id === id);
    if (!tab) return;
    if (!window.confirm(`Close "${tab.name}"? Its content will be lost.`)) return;
    flushDraft();
    flushSnapshot();
    if (state.activeId === id) state = setContent(state, id, editableNode.value);
    state = closeTab(state, id);
    if (!state.tabs.length) state = createTab(state, 'Tab ' + state.nextTabNumber);
    histories.delete(id);
    const activeTab = getActiveTab();
    editableNode.value = activeTab.content;
    lastValue = activeTab.content;
    persist();
    render();
    onUpdate();
    editableNode.dispatchEvent(new Event('input', { bubbles: true }));
    editableNode.focus();
  }

  function beginRename(id, nameNode) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tab-rename';
    input.maxLength = 30;
    input.value = state.tabs.find((tab) => tab.id === id).name;
    nameNode.replaceWith(input);
    input.focus();
    input.select();

    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      if (save) {
        const value = input.value.trim();
        if (value) {
          state = renameTab(state, id, value);
          persist();
        }
      }
      render();
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        finish(true);
        editableNode.focus();
      } else if (event.key === 'Escape') {
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));
  }

  tabBarNode.addEventListener('click', (event) => {
    if (Date.now() - lastDragTime < 100) return;
    const closeButton = event.target.closest('.tab-close');
    if (closeButton) {
      handleClose(closeButton.closest('.tab').dataset.id);
      return;
    }
    const tabElement = event.target.closest('.tab');
    if (tabElement) {
      activate(tabElement.dataset.id);
      return;
    }
    if (event.target.closest('.tab-new')) handleNew();
  });

  tabBarNode.addEventListener('dblclick', (event) => {
    const nameElement = event.target.closest('.tab-name');
    if (!nameElement) return;
    beginRename(nameElement.closest('.tab').dataset.id, nameElement);
  });

  tabBarNode.addEventListener('keydown', (event) => {
    // Don't hijack keys while the rename input is focused (typing spaces, etc.)
    if (event.target.tagName === 'INPUT') return;
    const tabElement = event.target.closest('.tab');
    if (!tabElement) return;
    const ids = state.tabs.map((tab) => tab.id);
    const index = ids.indexOf(tabElement.dataset.id);
    let nextIndex = -1;

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % ids.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + ids.length) % ids.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = ids.length - 1;

    if (nextIndex !== -1) {
      event.preventDefault();
      activate(ids[nextIndex]);
      const next = tabBarNode.querySelector(`.tab[data-id="${ids[nextIndex]}"]`);
      if (next) next.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(tabElement.dataset.id);
    }
  });

  // Drag to reorder tabs: pointer down on a tab starts a candidate, a move past
  // the threshold turns it into a drag that live-reorders the bar.
  let drag = null;
  let lastDragTime = 0;

  function syncStateFromDom() {
    const order = [...tabBarNode.querySelectorAll('.tab')].map((tab) => tab.dataset.id);
    state = { ...state, tabs: order.map((id) => state.tabs.find((tab) => tab.id === id)) };
  }

  tabBarNode.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const tabElement = event.target.closest('.tab');
    if (!tabElement || event.target.closest('.tab-close')) return;
    drag = {
      id: tabElement.dataset.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
  });

  document.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      drag.active = true;
      const el = tabBarNode.querySelector(`.tab[data-id="${drag.id}"]`);
      if (el) el.classList.add('dragging');
    }
    event.preventDefault();
    const others = [...tabBarNode.querySelectorAll('.tab')].filter(
      (tab) => tab.dataset.id !== drag.id
    );
    let target = others.length;
    for (let i = 0; i < others.length; i++) {
      const rect = others[i].getBoundingClientRect();
      if (event.clientX < rect.left + rect.width / 2) {
        target = i;
        break;
      }
    }
    const draggedEl = tabBarNode.querySelector(`.tab[data-id="${drag.id}"]`);
    if (!draggedEl) return;
    const anchor = others[target] || tabBarNode.querySelector('.tab-new');
    if (draggedEl.nextSibling === anchor) return;
    tabBarNode.insertBefore(draggedEl, anchor);
    syncStateFromDom();
  });

  const endDrag = () => {
    if (!drag) return;
    if (drag.active) {
      const el = tabBarNode.querySelector(`.tab[data-id="${drag.id}"]`);
      if (el) el.classList.remove('dragging');
      persist();
      lastDragTime = Date.now();
    }
    drag = null;
  };
  document.addEventListener('pointerup', (event) => {
    if (drag && event.pointerId === drag.pointerId) endDrag();
  });
  document.addEventListener('pointercancel', endDrag);

  function switchTab({ index, offset } = {}) {
    const ids = state.tabs.map((tab) => tab.id);
    const current = ids.indexOf(state.activeId);
    const target =
      index !== undefined ? index : (current + (offset || 1) + ids.length) % ids.length;
    if (ids[target]) activate(ids[target]);
  }

  function restoreTab(snapshot) {
    const targetId = snapshot.tabId || generateId();
    const existing = state.tabs.find((tab) => tab.id === targetId);
    state = existing
      ? setContent(renameTab(state, targetId, snapshot.name), targetId, snapshot.content)
      : {
          ...state,
          tabs: [...state.tabs, { id: targetId, name: snapshot.name, content: snapshot.content }],
          activeId: targetId,
        };
    state = setActiveTab(state, targetId);
    state = { ...state, nextTabNumber: deriveNextTabNumber(state.tabs) };
    histories.set(targetId, emptyHistory());
    const activeTab = getActiveTab();
    editableNode.value = activeTab.content;
    lastValue = activeTab.content;
    persist();
    render();
    onUpdate();
    editableNode.dispatchEvent(new Event('input', { bubbles: true }));
    editableNode.focus();
  }

  function restoreAll(snapshots) {
    const tabs = snapshots.map((snapshot) => ({
      id: snapshot.tabId || generateId(),
      name: snapshot.name,
      content: snapshot.content,
    }));
    state = {
      ...state,
      tabs,
      activeId: tabs.length ? tabs[0].id : state.activeId,
      nextTabNumber: deriveNextTabNumber(tabs),
    };
    histories.clear();
    const activeTab = getActiveTab();
    editableNode.value = activeTab.content;
    lastValue = activeTab.content;
    persist();
    render();
    onUpdate();
    editableNode.dispatchEvent(new Event('input', { bubbles: true }));
    editableNode.focus();
  }

  // If localStorage is unavailable or corrupt, rebuild the collection from the
  // most recent IndexedDB snapshot of each tab.
  async function recoverFromSnapshots() {
    try {
      const snapshots = await latestPerTab();
      if (snapshots.length) restoreAll(snapshots);
    } catch {
      // storage unavailable
    }
  }

  render();
  onUpdate();
  editableNode.focus();

  if (storageFailed) recoverFromSnapshots();

  return { switchTab, restoreTab, restoreAll };
}

export { createTab, closeTab, renameTab, setActiveTab, setContent, moveTab };
export { deriveNextTabNumber };
export { recordChange, commitDraft, applyUndo, applyRedo };
export default initTabs;
