// Uniform, guarded access to localStorage. Every module reads and writes
// storage through this wrapper so "storage is unavailable" behaves the same
// everywhere: reads return null, writes are no-ops, nothing throws.
import { STORAGE_ERROR } from './events.js';

function available() {
  try {
    return globalThis.localStorage !== undefined;
  } catch {
    return false;
  }
}

function get(key) {
  try {
    return available() ? globalThis.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

// Tell the UI a write failed (usually the storage quota is full) instead of
// losing the edit silently. Guarded so a worker/test without a window is fine.
function notifyFailure(key) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(STORAGE_ERROR, { detail: { key } }));
    }
  } catch {
    // no window, or events unavailable
  }
}

// Returns whether the write succeeded, so callers that care can react.
function set(key, value) {
  try {
    if (!available()) {
      notifyFailure(key);
      return false;
    }
    globalThis.localStorage.setItem(key, value);
    return true;
  } catch {
    notifyFailure(key);
    return false;
  }
}

function remove(key) {
  try {
    if (available()) globalThis.localStorage.removeItem(key);
  } catch {
    // storage unavailable
  }
}

const storage = { get, set, remove, available };
export default storage;
