import storage from '../util/storage.js';
import debounce from '../util/debounce.js';
import { generateId, normalizeCaret, deriveNextTabNumber } from '../core/tabsState.js';

// Persistence for the tab collection: the one-time load (with legacy-key
// migration, and a `failed` flag when storage is missing or corrupt) plus a
// debounced writer. Kept in the storage layer so js/ui/tabs.js is not also the
// store, and the writer reads a live getter rather than holding a stale state.
const STORAGE_KEY = 'math-notes-tabs';
const LEGACY_KEY = 'input';
// Where an unreadable saved collection is copied before the app can overwrite
// it, so a corrupt value is still recoverable by hand.
const BACKUP_KEY = 'math-notes-tabs-backup';

// A stored value is only usable as a collection when it is an object holding a
// non-empty tab array. Anything else (a truncated write, an old schema, a hand
// edit) must not be trusted to shape the running state.
function isTabCollection(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Array.isArray(value.tabs) &&
    value.tabs.length > 0
  );
}

// Rebuild usable tabs from whatever was stored. Entries that are not objects
// are dropped — a JSON `{"tabs":[null]}` used to throw here, which aborted
// boot() and left the page blank — while ids and names are repaired so every
// returned tab is one the UI can address and label.
function normalizeTabs(entries) {
  const seen = new Set();
  const tabs = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const content = typeof entry.content === 'string' ? entry.content : '';
    let id = typeof entry.id === 'string' && entry.id ? entry.id : generateId();
    while (seen.has(id)) id = generateId();
    seen.add(id);
    tabs.push({
      id,
      name:
        typeof entry.name === 'string' && entry.name.trim() ? entry.name : `Tab ${tabs.length + 1}`,
      content,
      caret: normalizeCaret(entry.caret, content.length),
    });
  }
  return tabs;
}

function loadTabsState() {
  const raw = storage.get(STORAGE_KEY);
  let saved = null;
  try {
    saved = JSON.parse(raw || 'null');
  } catch {
    saved = null;
  }
  const hasPayload = raw !== null && raw !== undefined && raw !== '';
  // Anything present but unusable — unparseable, the wrong shape, or a tab array
  // with nothing readable in it — counts as a failed load: the default
  // collection must not simply overwrite the only copy of the user's sheets.
  let unreadable = hasPayload && !isTabCollection(saved);
  let failed = unreadable || !storage.available();

  if (isTabCollection(saved)) {
    const tabs = normalizeTabs(saved.tabs);
    if (tabs.length) {
      // A stale activeId (a partial write, an old schema, a manual edit) would
      // make every subsequent setContent miss its tab and silently drop edits, so
      // repair it to the first tab when it no longer points at one.
      const hasActiveTab = tabs.some((tab) => tab.id === saved.activeId);
      const storedNext = saved.nextTabNumber;
      return {
        state: {
          tabs,
          activeId: hasActiveTab ? saved.activeId : tabs[0].id,
          nextTabNumber:
            Number.isInteger(storedNext) && storedNext > 0 ? storedNext : deriveNextTabNumber(tabs),
        },
        failed,
        // When this collection was last written, so a load can tell it is older
        // than snapshots saved after a write that failed. Null if it never said.
        savedAt: Number.isFinite(saved.savedAt) ? saved.savedAt : null,
      };
    }
    unreadable = true;
    failed = true;
  }

  // Copy an unreadable collection aside before the default one is written over
  // it, so the sheets are still recoverable by hand.
  if (unreadable) storage.set(BACKUP_KEY, raw);

  const content = storage.get(LEGACY_KEY) || '';
  storage.remove(LEGACY_KEY);
  const tab = { id: generateId(), name: 'Tab 1', content, caret: null };
  return { state: { tabs: [tab], activeId: tab.id, nextTabNumber: 2 }, failed, savedAt: null };
}

function createTabsWriter(getState, onWrite) {
  const write = () => {
    storage.set(STORAGE_KEY, JSON.stringify({ ...getState(), savedAt: Date.now() }));
    if (onWrite) onWrite();
  };
  const debounced = debounce(write, 400);
  return {
    // Write now, regardless of any pending schedule.
    persist: () => debounced.run(),
    // Coalesce a burst of edits into one write.
    schedule: () => debounced.schedule(),
    // Write now only if one is pending.
    flush: () => debounced.flush(),
    // Drop a pending write without running it (used by Reset data).
    cancel: () => debounced.cancel(),
  };
}

export { STORAGE_KEY, LEGACY_KEY, BACKUP_KEY, loadTabsState, createTabsWriter };
