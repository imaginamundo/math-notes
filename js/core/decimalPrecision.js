import storage from '../util/storage.js';

// How many decimal places results show. Display only: calculations keep full
// precision.
const STORAGE_KEY = 'math-notes-decimal-precision';
const DEFAULT_PRECISION = 3;
const MIN_PRECISION = 0;
const MAX_PRECISION = 10;

// The precision the renderers format with, kept in memory so drawing a row does
// not read localStorage on every result (the worker holds its own copy, sent as
// a message). Set at startup and on `precision:updated`.
let current = DEFAULT_PRECISION;

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
  const normalized = normalizeDecimalPrecision(value);
  storage.set(STORAGE_KEY, String(normalized));
  current = normalized;
}

function getDecimalPrecision() {
  return current;
}

function setDecimalPrecision(value) {
  current = normalizeDecimalPrecision(value);
}

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
