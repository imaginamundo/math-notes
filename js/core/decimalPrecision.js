import defineSetting from './setting.js';

// How many decimal places results show. Display only: calculations keep full
// precision.
const DEFAULT_PRECISION = 3;
const MIN_PRECISION = 0;
const MAX_PRECISION = 10;

function normalizeDecimalPrecision(value) {
  if (value === '' || value === null || value === undefined) return DEFAULT_PRECISION;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_PRECISION;
  return Math.min(MAX_PRECISION, Math.max(MIN_PRECISION, n));
}

// The precision the renderers format with is kept in memory so drawing a row
// does not read storage (the worker holds its own copy, sent as a message).
const setting = defineSetting({
  key: 'math-notes-decimal-precision',
  defaultValue: DEFAULT_PRECISION,
  normalize: normalizeDecimalPrecision,
  format: String,
  inMemory: true,
});

const STORAGE_KEY = setting.key;
const readDecimalPrecision = setting.read;
const writeDecimalPrecision = setting.write;
const getDecimalPrecision = setting.get;
const setDecimalPrecision = setting.set;

export {
  STORAGE_KEY,
  DEFAULT_PRECISION,
  MIN_PRECISION,
  MAX_PRECISION,
  normalizeDecimalPrecision,
  readDecimalPrecision,
  writeDecimalPrecision,
  getDecimalPrecision,
  setDecimalPrecision,
};
