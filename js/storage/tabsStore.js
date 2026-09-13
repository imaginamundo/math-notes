import storage from '../util/storage.js';
import debounce from '../util/debounce.js';
import { generateId } from '../core/tabsState.js';

// Persistence for the tab collection: the one-time load (with legacy-key
// migration, and a `failed` flag when storage is missing or corrupt) plus a
// debounced writer. Kept in the storage layer so js/ui/tabs.js is not also the
// store, and the writer reads a live getter rather than holding a stale state.
const STORAGE_KEY = 'math-notes-tabs';
const LEGACY_KEY = 'input';

function loadTabsState() {
  let saved = null;
  let failed = false;
  try {
    saved = JSON.parse(storage.get(STORAGE_KEY) || 'null');
  } catch {
    // malformed saved collection, fall back to the default below
    failed = true;
  }
  if (!storage.available()) failed = true;
  if (saved && Array.isArray(saved.tabs) && saved.tabs.length) {
    // A stale activeId (a partial write, an old schema, a manual edit) would
    // make every subsequent setContent miss its tab and silently drop edits, so
    // repair it to the first tab when it no longer points at one.
    const hasActiveTab = saved.tabs.some((tab) => tab.id === saved.activeId);
    return {
      state: {
        ...saved,
        activeId: hasActiveTab ? saved.activeId : saved.tabs[0].id,
        nextTabNumber: saved.nextTabNumber || saved.tabs.length + 1,
      },
      failed,
    };
  }
  const content = storage.get(LEGACY_KEY) || '';
  storage.remove(LEGACY_KEY);
  const tab = { id: generateId(), name: 'Tab 1', content };
  return { state: { tabs: [tab], activeId: tab.id, nextTabNumber: 2 }, failed };
}

function createTabsWriter(getState) {
  const write = () => storage.set(STORAGE_KEY, JSON.stringify(getState()));
  const debounced = debounce(write, 400);
  return {
    // Write now, regardless of any pending schedule.
    persist: () => debounced.run(),
    // Coalesce a burst of edits into one write.
    schedule: () => debounced.schedule(),
    // Write now only if one is pending.
    flush: () => debounced.flush(),
  };
}

export { STORAGE_KEY, LEGACY_KEY, loadTabsState, createTabsWriter };
