import { saveSnapshot, latestPerTab } from '../storage/snapshots.js';
import {
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
} from '../core/tabsState.js';
import { STORAGE_KEY, LEGACY_KEY, loadTabsState, createTabsWriter } from '../storage/tabsStore.js';
import createHistoryStore from './tabsHistory.js';
import createTabsView from './tabsView.js';
import debounce from '../util/debounce.js';
import { changeCaret } from '../util/text.js';
import { t } from '../i18n/index.js';

// The tab controller: it holds the single `state`, owns activation, undo,
// snapshots and the public sheet API, and delegates the three side concerns to
// their own modules — persistence (storage/tabsStore.js), undo history
// (tabsHistory.js) and the tab-bar DOM (tabsView.js).
const SNAPSHOT_DELAY = 2000;

function initTabs(editableNode, onUpdate) {
  // Per-instance state, held in the closure rather than at module scope so a
  // second initTabs() would get its own tabs instead of sharing a global.
  let state = null;
  // Set by reset(): persistence is stopped so the reload that follows starts
  // from a genuinely empty first-run state.
  let resetting = false;
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
    newFromTemplate: (template) => openSheet(template),
    rename: handleRename,
    reorder: handleReorder,
    dragged: () => writer.persist(),
  });

  const getActiveTab = () => state.tabs.find((tab) => tab.id === state.activeId) || state.tabs[0];

  let lastValue = getActiveTab().content;

  const burst = debounce(() => history.commit(state.activeId, editableNode.value), 700);
  const snapshot = debounce(saveActiveSnapshot, SNAPSHOT_DELAY);

  function saveActiveSnapshot() {
    if (resetting) return;
    const tab = getActiveTab();
    if (!tab) return;
    saveSnapshot({ id: tab.id, name: tab.name, content: tab.content }).catch(() => {});
  }

  function scheduleSnapshot() {
    if (resetting) return;
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
    captureCaret();
  }

  // Present `content` as the new active sheet: update the editor, persist,
  // repaint, evaluate, and notify every input-driven subscriber exactly once.
  // A programmatic write (tab switch, undo/redo, restore, seed) must not look
  // like a user edit to features that key off the `input` event.
  function dispatchInput() {
    const event = new Event('input', { bubbles: true });
    event.programmatic = true;
    editableNode.dispatchEvent(event);
  }

  // A saved caret is restored last (after focus) when it is valid.
  function present(content, { focus = true, caret = null } = {}) {
    editableNode.value = content;
    lastValue = content;
    writer.persist();
    view.render();
    onUpdate();
    dispatchInput();
    if (focus) editableNode.focus();
    restoreCaret(caret);
  }

  // Restore a tab's saved caret. `normalizeCaret` rejects anything that is not a
  // valid in-range selection and the DOM call is guarded, so a bad value simply
  // leaves the caret where the browser put it.
  function restoreCaret(caret) {
    const selection = normalizeCaret(caret, editableNode.value.length);
    if (!selection) return;
    try {
      editableNode.setSelectionRange(selection.start, selection.end);
    } catch {
      // an unusable selection is ignored
    }
  }

  // Remember the active tab's caret so it survives a reload. The selection is
  // still readable when the editor is blurred, and `writer.schedule` coalesces
  // the writes.
  function captureCaret() {
    if (resetting) return;
    const start = editableNode.selectionStart;
    const end = editableNode.selectionEnd;
    if (!Number.isInteger(start) || !Number.isInteger(end)) return;
    state = setCaret(state, state.activeId, { start, end });
    writer.schedule();
  }

  function setValue(value, caret = null) {
    lastValue = value;
    editableNode.value = value;
    // Assigning `.value` collapses the caret to the end; restore it (clamped to
    // the new length) before the input event repaints, so undo/redo keep the
    // view near the change instead of jumping to the bottom of a large sheet.
    if (caret) {
      const start = Math.min(caret.start, value.length);
      const end = Math.min(caret.end === undefined ? caret.start : caret.end, value.length);
      editableNode.setSelectionRange(start, end);
    }
    state = setContent(state, state.activeId, value);
    writer.persist();
    scheduleSnapshot();
    dispatchInput();
    captureCaret();
  }

  function undo() {
    flushDraft();
    const value = history.undo(state.activeId, lastValue);
    if (value === null) return;
    const position = changeCaret(lastValue, value);
    setValue(value, { start: position, end: position });
  }

  function redo() {
    flushDraft();
    const value = history.redo(state.activeId, lastValue);
    if (value === null) return;
    const position = changeCaret(lastValue, value);
    setValue(value, { start: position, end: position });
  }

  editableNode.value = lastValue;

  editableNode.addEventListener('input', () => {
    if (resetting) return;
    const value = editableNode.value;
    if (value === lastValue) return;
    history.record(state.activeId, lastValue, value);
    lastValue = value;
    burst.schedule();
    state = setContent(state, state.activeId, value);
    writer.schedule();
    scheduleSnapshot();
    captureCaret();
  });

  // Keep the stored caret current as the user moves it (arrow keys, a click, a
  // selection). The persist is debounced, so this stays cheap.
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === editableNode) captureCaret();
  });

  const flushPersist = () => writer.flush();
  const flushAll = () => {
    if (resetting) return;
    flushDraft();
    captureCaret();
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
    present(tab.content, { caret: tab.caret });
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

  // Return to a first-run state: drop every tab, its undo history and any
  // pending write, and stop persisting. The reload that follows (Reset data)
  // then starts empty, so onboarding re-seeds the Welcome sheet and the tab
  // counter is back at 2. Without this the pagehide/blur flush would write the
  // in-memory tabs back over the storage Reset data just removed.
  function reset() {
    resetting = true;
    burst.cancel();
    snapshot.cancel();
    writer.cancel();
    history.clear();
    const tab = {
      id: generateId(),
      name: t('tabs.defaultName', { n: 1 }),
      content: '',
      caret: null,
    };
    state = { tabs: [tab], activeId: tab.id, nextTabNumber: 2 };
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
    const active = getActiveTab();
    present(active.content, { caret: active.caret });
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
    const restored = getActiveTab();
    present(restored.content, { caret: restored.caret });
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
    const restored = getActiveTab();
    present(restored.content, { caret: restored.caret });
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
  // Return to where the user left the active tab, when the saved caret is valid.
  restoreCaret(getActiveTab().caret);

  // Re-render the tab bar (its aria-labels/titles) when the language changes.
  window.addEventListener('language:updated', () => view.render());

  if (storageFailed) recoverFromSnapshots();

  return { switchTab, restoreTab, restoreAll, openSheet, getActiveSheet, seedSheet, reset };
}

export { STORAGE_KEY, LEGACY_KEY };
export {
  createTab,
  closeTab,
  renameTab,
  setActiveTab,
  setContent,
  setCaret,
  normalizeCaret,
  moveTab,
};
export { deriveNextTabNumber };
export default initTabs;
