import { emptyHistory, recordChange, commitDraft, applyUndo, applyRedo } from '../core/history.js';

// Per-tab undo/redo, kept in memory only and never persisted. Wraps the pure
// js/core/history.js helpers with the per-tab map, so the controller addresses
// history by tab id and never touches the entries directly.
function createHistoryStore() {
  const entries = new Map();
  const get = (id) => {
    let entry = entries.get(id);
    if (!entry) {
      entry = emptyHistory();
      entries.set(id, entry);
    }
    return entry;
  };
  return {
    record(id, lastValue, newValue) {
      entries.set(id, recordChange(get(id), lastValue, newValue));
    },
    commit(id, current) {
      entries.set(id, commitDraft(get(id), current));
    },
    // The value to restore, or null when there is nothing to undo/redo.
    undo(id, current) {
      const result = applyUndo(get(id), current);
      if (!result) return null;
      entries.set(id, result.entry);
      return result.value;
    },
    redo(id, current) {
      const result = applyRedo(get(id), current);
      if (!result) return null;
      entries.set(id, result.entry);
      return result.value;
    },
    // Forget a tab's history (e.g. after a restore or seed).
    reset(id) {
      entries.set(id, emptyHistory());
    },
    // Drop one tab's history (e.g. a closed tab).
    remove(id) {
      entries.delete(id);
    },
    clear() {
      entries.clear();
    },
  };
}

export default createHistoryStore;
