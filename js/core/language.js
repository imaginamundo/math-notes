import storage from '../util/storage.js';

// The interface language. English is the fallback, and what is used when the
// system language is not one we translate.
const STORAGE_KEY = 'math-notes-language';
const SUPPORTED_LANGUAGES = ['en', 'pt', 'es'];
const DEFAULT_LANGUAGE = 'en';

// Map a BCP-47 tag (`pt-BR`, `es-419`) or a stored value onto a supported code.
function normalizeLanguage(value) {
  if (typeof value !== 'string' || value === '') return DEFAULT_LANGUAGE;
  const base = value.toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : DEFAULT_LANGUAGE;
}

// The user's explicit choice, or null when they have never picked one (so
// startup can fall back to the system language).
function readStoredLanguage() {
  const raw = storage.get(STORAGE_KEY);
  return raw ? normalizeLanguage(raw) : null;
}

// The language the rest of the app reads. Kept in memory so lookups do not hit
// storage (the worker has no storage; it receives the value as a message).
let current = DEFAULT_LANGUAGE;

function getLanguage() {
  return current;
}

function setLanguage(value) {
  current = normalizeLanguage(value);
}

function writeLanguage(value) {
  const normalized = normalizeLanguage(value);
  storage.set(STORAGE_KEY, normalized);
  current = normalized;
}

export {
  STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  readStoredLanguage,
  getLanguage,
  setLanguage,
  writeLanguage,
};
