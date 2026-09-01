const STORAGE_KEY = 'math-notes-tabs';
const LEGACY_KEY = 'input';
const HISTORY_LIMIT = 100;

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

function loadInitialState() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    // storage unavailable or malformed, fall back to the null default
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

  const history = () => {
    let entry = histories.get(state.activeId);
    if (!entry) {
      entry = emptyHistory();
      histories.set(state.activeId, entry);
    }
    return entry;
  };

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

  render();
  onUpdate();
  editableNode.focus();
}

export { createTab, closeTab, renameTab, setActiveTab, setContent };
export { recordChange, commitDraft, applyUndo, applyRedo };
export default initTabs;
