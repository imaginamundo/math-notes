// Per-tab undo/redo history, kept in memory only (not persisted). Each entry is
// { undo: string[], redo: string[], draft: string | null } where `draft` is the
// value captured at the start of the current typing burst.
//
// Pure and free of any DOM dependency, so it can live next to the rest of the
// core logic and be unit-tested without a document.
const HISTORY_LIMIT = 100;

/**
 * @typedef {{ undo: string[], redo: string[], draft: string|null }} History
 */

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

// End a burst: the draft becomes the undo boundary for the whole burst. A
// burst that typed its way back to the starting value (undo would be a no-op)
// is dropped entirely.
function commitDraft(entry, current) {
  if (entry.draft === null) return entry;
  if (current === entry.draft) return { ...entry, draft: null };
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

export { emptyHistory, recordChange, commitDraft, applyUndo, applyRedo };
