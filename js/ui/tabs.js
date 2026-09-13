import { saveSnapshot, latestPerTab } from '../storage/snapshots.js';
import {
  generateId,
  createTab,
  closeTab,
  renameTab,
  setActiveTab,
  setContent,
  moveTab,
  deriveNextTabNumber,
} from '../core/tabsState.js';
import { STORAGE_KEY, LEGACY_KEY, loadTabsState, createTabsWriter } from '../storage/tabsStore.js';
import createHistoryStore from './tabsHistory.js';
import createTabsView from './tabsView.js';
import debounce from '../util/debounce.js';
import { t } from '../i18n/index.js';

// The tab controller: it holds the single `state`, owns activation, undo,
// snapshots and the public sheet API, and delegates the three side concerns to
// their own modules — persistence (storage/tabsStore.js), undo history
// (tabsHistory.js) and the tab-bar DOM (tabsView.js).
const SNAPSHOT_DELAY = 2000;

let state = null;

function initTabs(editableNode, onUpdate) {
  const tabBarNode = document.getElementById('tabs-bar');
  const { state: loadedState, failed: storageFailed } = loadTabsState();
  state = loadedState;

  const writer = createTabsWriter(() => state);
  const history = createHistoryStore();
  writer.persist();

  const view = createTabsView(tabBarNode, {
    getState: () => state,
    focusEditor: () => editableNode.focus(),
    activate,
    close: handleClose,
    create: handleNew,
    rename: handleRename,
    reorder: handleReorder,
    dragged: () => writer.persist(),
  });

  const getActiveTab = () => state.tabs.find((tab) => tab.id === state.activeId) || state.tabs[0];

  let lastValue = getActiveTab().content;

  const burst = debounce(() => history.commit(state.activeId, editableNode.value), 700);
  const snapshot = debounce(saveActiveSnapshot, SNAPSHOT_DELAY);

  function saveActiveSnapshot() {
    const tab = getActiveTab();
    if (!tab) return;
    saveSnapshot({ id: tab.id, name: tab.name, content: tab.content }).catch(() => {});
  }

  function scheduleSnapshot() {
    snapshot.schedule();
  }

  function flushSnapshot() {
    snapshot.flush();
  }

  function flushDraft() {
    burst.run();
  }

  // Commit any pending draft/snapshot for the outgoing tab and mirror its
  // live textarea content back into the tab state before the active tab moves.
  function leaveActiveTab() {
    flushDraft();
    flushSnapshot();
    state = setContent(state, state.activeId, editableNode.value);
  }

  // Present `content` as the new active sheet: update the editor, persist,
  // repaint, evaluate, and notify every input-driven subscriber exactly once.
  function present(content, { focus = true } = {}) {
    editableNode.value = content;
    lastValue = content;
    writer.persist();
    view.render();
    onUpdate();
    editableNode.dispatchEvent(new Event('input', { bubbles: true }));
    if (focus) editableNode.focus();
  }

  function setValue(value) {
    lastValue = value;
    editableNode.value = value;
    state = setContent(state, state.activeId, value);
    writer.persist();
    scheduleSnapshot();
    editableNode.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function undo() {
    flushDraft();
    const value = history.undo(state.activeId, lastValue);
    if (value === null) return;
    setValue(value);
  }

  function redo() {
    flushDraft();
    const value = history.redo(state.activeId, lastValue);
    if (value === null) return;
    setValue(value);
  }

  editableNode.value = lastValue;

  editableNode.addEventListener('input', () => {
    const value = editableNode.value;
    if (value === lastValue) return;
    history.record(state.activeId, lastValue, value);
    lastValue = value;
    burst.schedule();
    state = setContent(state, state.activeId, value);
    writer.schedule();
    scheduleSnapshot();
  });

  const flushPersist = () => writer.flush();
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

  function handleRename(id, name) {
    state = renameTab(state, id, name);
    writer.persist();
  }

  // The view has already moved the nodes; mirror the new order into the state.
  function handleReorder(ids) {
    state = { ...state, tabs: ids.map((id) => state.tabs.find((tab) => tab.id === id)) };
  }

  function activate(id) {
    if (state.activeId === id) {
      editableNode.focus();
      return;
    }
    leaveActiveTab();
    state = setActiveTab(state, id);
    const tab = state.tabs.find((entry) => entry.id === id);
    present(tab.content);
  }

  function handleNew() {
    leaveActiveTab();
    state = createTab(state, t('tabs.defaultName', { n: state.nextTabNumber }));
    present('');
  }

  // Open a sheet that came from outside the app (a share link) in a NEW tab.
  // It never overwrites the active tab: an import is additive by design.
  function openSheet({ name, content }) {
    leaveActiveTab();
    state = createTab(state, name || t('share.defaultName'));
    state = setContent(state, state.activeId, content || '');
    present(content || '');
  }

  function getActiveSheet() {
    const tab = getActiveTab();
    return { name: tab ? tab.name : '', content: editableNode.value };
  }

  // Fill the active tab with starter content and rename it. Only ever called
  // on a genuine first run, so it deliberately writes into the existing empty
  // tab rather than adding one.
  function seedSheet({ name, content }) {
    state = renameTab(state, state.activeId, name);
    state = setContent(state, state.activeId, content);
    history.reset(state.activeId);
    present(content, { focus: false });
  }

  function handleClose(id) {
    const tab = state.tabs.find((entry) => entry.id === id);
    if (!tab) return;
    if (!window.confirm(t('tabs.closeConfirm', { name: tab.name }))) return;
    leaveActiveTab();
    state = closeTab(state, id);
    if (!state.tabs.length)
      state = createTab(state, t('tabs.defaultName', { n: state.nextTabNumber }));
    history.remove(id);
    present(getActiveTab().content);
  }

  function switchTab({ index, offset } = {}) {
    const ids = state.tabs.map((tab) => tab.id);
    const current = ids.indexOf(state.activeId);
    const target =
      index !== undefined ? index : (current + (offset || 1) + ids.length) % ids.length;
    if (ids[target]) activate(ids[target]);
  }

  function restoreTab(snapshot) {
    leaveActiveTab();
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
    history.reset(targetId);
    present(getActiveTab().content);
  }

  function restoreAll(snapshots) {
    leaveActiveTab();
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
    history.clear();
    present(getActiveTab().content);
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

  view.render();
  onUpdate();
  editableNode.focus();

  // Re-render the tab bar (its aria-labels/titles) when the language changes.
  window.addEventListener('language:updated', () => view.render());

  if (storageFailed) recoverFromSnapshots();

  return { switchTab, restoreTab, restoreAll, openSheet, getActiveSheet, seedSheet };
}

export { STORAGE_KEY, LEGACY_KEY };
export { createTab, closeTab, renameTab, setActiveTab, setContent, moveTab };
export { deriveNextTabNumber };
export default initTabs;
