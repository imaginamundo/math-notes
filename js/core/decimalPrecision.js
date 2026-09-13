import storage from '../util/storage.js';

// How many decimal places results show. Display only: calculations keep full
// precision.
const STORAGE_KEY = 'math-notes-decimal-precision';
const DEFAULT_PRECISION = 3;
const MIN_PRECISION = 0;
const MAX_PRECISION = 10;

function normalizeDecimalPrecision(value) {
  if (value === '' || value === null || value === undefined) return DEFAULT_PRECISION;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_PRECISION;
  return Math.min(MAX_PRECISION, Math.max(MIN_PRECISION, n));
}

function readDecimalPrecision() {
  const raw = storage.get(STORAGE_KEY);
  if (raw === null || raw === undefined) return DEFAULT_PRECISION;
  return normalizeDecimalPrecision(raw);
}

function writeDecimalPrecision(value) {
  storage.set(STORAGE_KEY, String(normalizeDecimalPrecision(value)));
}

export {
  STORAGE_KEY,
  DEFAULT_PRECISION,
  MIN_PRECISION,
  MAX_PRECISION,
  normalizeDecimalPrecision,
  readDecimalPrecision,
  writeDecimalPrecision,
};
