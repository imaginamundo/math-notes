const STORAGE_KEY = 'math-notes-tabs';
const LEGACY_KEY = 'input';

let state = null;

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

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable
  }
}

function initTabs(editableNode, onUpdate) {
  const tabBarNode = document.getElementById('tabs-bar');
  state = loadInitialState();
  persist();

  const getActiveTab = () => state.tabs.find((tab) => tab.id === state.activeId) || state.tabs[0];

  editableNode.value = getActiveTab().content;

  editableNode.addEventListener('input', () => {
    state = setContent(state, state.activeId, editableNode.value);
    persist();
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
    if (state.activeId === id) return;
    state = setContent(state, state.activeId, editableNode.value);
    state = setActiveTab(state, id);
    editableNode.value = state.tabs.find((tab) => tab.id === id).content;
    persist();
    render();
    onUpdate();
    editableNode.focus();
  }

  function handleNew() {
    state = setContent(state, state.activeId, editableNode.value);
    state = createTab(state, 'Tab ' + state.nextTabNumber);
    editableNode.value = '';
    persist();
    render();
    onUpdate();
    editableNode.focus();
  }

  function handleClose(id) {
    const tab = state.tabs.find((tab) => tab.id === id);
    if (!tab) return;
    if (!window.confirm(`Close "${tab.name}"? Its content will be lost.`)) return;
    if (state.activeId === id) state = setContent(state, id, editableNode.value);
    state = closeTab(state, id);
    if (!state.tabs.length) state = createTab(state, 'Tab ' + state.nextTabNumber);
    editableNode.value = getActiveTab().content;
    persist();
    render();
    onUpdate();
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
      if (event.key === 'Enter') finish(true);
      else if (event.key === 'Escape') finish(false);
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
export default initTabs;
