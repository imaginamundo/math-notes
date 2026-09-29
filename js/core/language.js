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

// Persist a language choice. The language is UI-only (the worker never needs
// it), so it is not kept in module state.
function writeLanguage(value) {
  storage.set(STORAGE_KEY, normalizeLanguage(value));
}

export {
  STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  readStoredLanguage,
  writeLanguage,
};
