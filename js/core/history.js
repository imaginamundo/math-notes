// Per-tab undo/redo history, kept in memory only (not persisted). Each entry is
// { undo: string[], redo: string[], draft: string | null } where `draft` is the
// value captured at the start of the current typing burst.
//
// Pure and free of any DOM dependency, so it can live next to the rest of the
// core logic and be unit-tested without a document.
const HISTORY_LIMIT = 100;
// Each undo step is a whole sheet string, so cap their total size as well as
// their count. The newest step is always kept, so even a single sheet larger
// than the budget can still be undone once.
const HISTORY_BYTES = 2 * 1024 * 1024;

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
  return { undo: trimHistory([...entry.undo, entry.draft]), redo: [], draft: null };
}

// Keep the most recent steps, bounded by count and total characters: walk back
// from the newest until the budget is spent, but never drop the newest step.
function trimHistory(undo) {
  const countFloor = Math.max(0, undo.length - HISTORY_LIMIT);
  let bytes = 0;
  let start = undo.length;
  while (start > countFloor) {
    const size = undo[start - 1].length;
    if (bytes + size > HISTORY_BYTES && start < undo.length) break;
    bytes += size;
    start--;
  }
  return start === 0 ? undo : undo.slice(start);
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

export { emptyHistory, recordChange, commitDraft, applyUndo, applyRedo, HISTORY_BYTES };
