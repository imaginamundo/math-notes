import storage from '../util/storage.js';

// How clock times are written: 24-hour (`19:12`) or 12-hour (`7:12 pm`).
const STORAGE_KEY = 'math-notes-clock-format';
const CLOCK_FORMATS = ['24', '12'];
const DEFAULT_CLOCK_FORMAT = '24';

function normalizeClockFormat(value) {
  return CLOCK_FORMATS.includes(value) ? value : DEFAULT_CLOCK_FORMAT;
}

function readClockFormat() {
  return normalizeClockFormat(storage.get(STORAGE_KEY));
}

function writeClockFormat(value) {
  storage.set(STORAGE_KEY, normalizeClockFormat(value));
}

// The format the engines format with. The worker and the main-thread fallback
// each hold their own copy, set from the stored value and on `clock-format`
// updates, because a worker has no storage of its own.
let current = DEFAULT_CLOCK_FORMAT;

function getClockFormat() {
  return current;
}

function setClockFormat(value) {
  current = normalizeClockFormat(value);
}

export {
  STORAGE_KEY,
  CLOCK_FORMATS,
  DEFAULT_CLOCK_FORMAT,
  normalizeClockFormat,
  readClockFormat,
  writeClockFormat,
  getClockFormat,
  setClockFormat,
};
