import storage from '../util/storage.js';

// Which aggregate the bottom total bar shows. `sum` is the default.
const STORAGE_KEY = 'math-notes-total-mode';
const TOTAL_MODES = ['sum', 'average', 'median'];
const DEFAULT_TOTAL_MODE = 'sum';

function normalizeTotalMode(value) {
  return TOTAL_MODES.includes(value) ? value : DEFAULT_TOTAL_MODE;
}

function readTotalMode() {
  return normalizeTotalMode(storage.get(STORAGE_KEY));
}

function writeTotalMode(value) {
  storage.set(STORAGE_KEY, normalizeTotalMode(value));
}

export {
  STORAGE_KEY,
  TOTAL_MODES,
  DEFAULT_TOTAL_MODE,
  normalizeTotalMode,
  readTotalMode,
  writeTotalMode,
};
