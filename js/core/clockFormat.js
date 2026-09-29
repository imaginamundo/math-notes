import defineSetting from './setting.js';

// How clock times are written: 24-hour (`19:12`) or 12-hour (`7:12 pm`).
const CLOCK_FORMATS = ['24', '12'];
const DEFAULT_CLOCK_FORMAT = '24';

// The format the engines format with is kept in memory (the worker and the
// main-thread fallback each hold a copy, set from the stored value or a message).
const setting = defineSetting({
  key: 'math-notes-clock-format',
  values: CLOCK_FORMATS,
  defaultValue: DEFAULT_CLOCK_FORMAT,
  inMemory: true,
});

const STORAGE_KEY = setting.key;
const normalizeClockFormat = setting.normalize;
const readClockFormat = setting.read;
const writeClockFormat = setting.write;
const getClockFormat = setting.get;
const setClockFormat = setting.set;

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
