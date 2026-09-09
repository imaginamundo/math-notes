// Uniform, guarded access to localStorage. Every module reads and writes
// storage through this wrapper so "storage is unavailable" behaves the same
// everywhere: reads return null, writes are no-ops, nothing throws.
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

function set(key, value) {
  try {
    if (available()) globalThis.localStorage.setItem(key, value);
  } catch {
    // storage unavailable or full; treat as a no-op
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
