// A sheet that kills the tab while it is being calculated (an out-of-memory
// worker takes the whole renderer with it) is the worst kind of bug: the page
// restores the same sheet on load and dies again, every time, with no way to
// reach Settings or the snapshots (REVIEW.md PRE-01).
//
// The guard breaks that loop. Before a sheet is sent for evaluation its
// fingerprint is stored as "running"; when the reply (or a failure) arrives, it
// is cleared. If the next load finds a "running" fingerprint, the page died
// mid-evaluation: that exact sheet text is moved to a short list of paused
// sheets and is not evaluated again. Any edit changes the fingerprint, so the
// user is one keystroke from calculating again, and closing the tab removes it.
import storage from '../util/storage.js';

export const GUARD_KEY = 'math-notes-evaluating';
const MAX_PAUSED = 8;

// A short stable fingerprint (FNV-1a over the text, plus its length); it only has
// to tell sheets apart, not resist anyone.
export function fingerprint(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${text.length}:${hash.toString(16)}`;
}

function read(store) {
  try {
    const parsed = JSON.parse(store.get(GUARD_KEY) || 'null');
    return {
      running: typeof parsed?.running === 'string' ? parsed.running : null,
      paused: Array.isArray(parsed?.paused)
        ? parsed.paused.filter((entry) => typeof entry === 'string').slice(-MAX_PAUSED)
        : [],
    };
  } catch {
    return { running: null, paused: [] };
  }
}

/**
 * @param {{ get: (key: string) => string | null, set: (key: string, value: string) => boolean, remove: (key: string) => void }} [store]
 */
export function createEvalGuard(store = storage) {
  const state = read(store);

  function save() {
    if (state.running === null && state.paused.length === 0) store.remove(GUARD_KEY);
    else store.set(GUARD_KEY, JSON.stringify(state));
  }

  // The previous page ended while this sheet was running: pause it.
  if (state.running !== null) {
    if (!state.paused.includes(state.running)) state.paused.push(state.running);
    state.paused = state.paused.slice(-MAX_PAUSED);
    state.running = null;
    save();
  }

  return {
    /** Whether this exact sheet text stopped the app last time. */
    isPaused: (text) => state.paused.includes(fingerprint(text)),
    /** Record that this sheet is about to be calculated. */
    begin(text) {
      state.running = fingerprint(text);
      save();
    },
    /** Record that the calculation finished, or failed in a way the page survived. */
    end() {
      if (state.running === null) return;
      state.running = null;
      save();
    },
  };
}
