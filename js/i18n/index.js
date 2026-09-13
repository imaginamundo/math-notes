import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  readStoredLanguage,
  setLanguage as setCoreLanguage,
  writeLanguage as persistLanguage,
} from '../core/language.js';
import en from './ui/en.js';
import pt from './ui/pt.js';
import es from './ui/es.js';

// The interface strings live per language in ./ui/. Only the app chrome is
// translated in v1 — the calculator itself keeps English syntax and output.
const MESSAGES = { en, pt, es };

let current = DEFAULT_LANGUAGE;

// The first of `candidates` (BCP-47 tags) we translate, else English.
function detectLanguage(candidates) {
  const list =
    candidates ||
    (typeof navigator !== 'undefined'
      ? navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language]
      : []);
  for (const candidate of list) {
    if (typeof candidate !== 'string') continue;
    const base = candidate.toLowerCase().split(/[-_]/)[0];
    if (SUPPORTED_LANGUAGES.includes(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

function interpolate(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}

// Translate `key` in the active language, falling back to English, then to the
// key itself so a missing entry is obvious rather than blank.
function t(key, params) {
  const value = MESSAGES[current]?.[key] ?? MESSAGES[DEFAULT_LANGUAGE][key];
  return interpolate(value ?? key, params);
}

// Apply the `data-i18n*` markers to static markup. `data-i18n` sets text,
// `data-i18n-html` sets markup (for strings with inline tags), and the other
// markers set the matching attribute.
function applyTranslations(root) {
  if (typeof document === 'undefined') return;
  const scope = root || document;
  document.documentElement.lang = current;
  document.title = t('app.name');
  for (const el of scope.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.getAttribute('data-i18n'));
  }
  for (const el of scope.querySelectorAll('[data-i18n-html]')) {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  }
  const attributes = [
    ['aria-label', 'data-i18n-aria-label'],
    ['title', 'data-i18n-title'],
    ['placeholder', 'data-i18n-placeholder'],
  ];
  for (const [attribute, marker] of attributes) {
    for (const el of scope.querySelectorAll(`[${marker}]`)) {
      el.setAttribute(attribute, t(el.getAttribute(marker)));
    }
  }
}

function getLocale() {
  return current;
}

// Switch language: update the preference, repaint the static text (and <html
// lang>), then let the dynamically built UI redraw itself.
function setLocale(language, { persist = true } = {}) {
  current = normalizeLanguage(language);
  setCoreLanguage(current);
  if (persist) persistLanguage(current);
  if (typeof document !== 'undefined') applyTranslations(document);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('language:updated', { detail: current }));
  }
}

// Resolve the startup language: the stored choice, else the system language.
function initI18n() {
  const stored = readStoredLanguage();
  setLocale(stored || detectLanguage(), { persist: false });
}

export { t, applyTranslations, detectLanguage, getLocale, setLocale, initI18n, MESSAGES };
