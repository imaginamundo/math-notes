import { CURRENCY_CODES } from './symbols.js';

const BASE = 'EUR';
const API_URL = 'https://api.frankfurter.dev/v1/latest?from=' + BASE;
const STORAGE_KEY = 'math-notes-currency-rates';

function ensureBaseUnit(math) {
  try {
    math.createUnit(BASE);
  } catch (error) {
    // base unit already exists
  }
}

function registerRates(math, data) {
  if (!math.createUnit || !data || data.base !== BASE || !data.rates) return;
  ensureBaseUnit(math);
  for (const [code, perBase] of Object.entries(data.rates)) {
    if (code.toUpperCase() === BASE) continue;
    CURRENCY_CODES.add(code.toUpperCase());
    try {
      math.createUnit(code, { definition: `${1 / perBase} ${BASE}` }, { override: true });
    } catch (error) {
      // skip codes that cannot be registered
    }
  }
}

function loadCached() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed && parsed.base && parsed.rates ? parsed : null;
  } catch (error) {
    return null;
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, fetchedAt: Date.now() }));
  } catch (error) {
    // storage unavailable
  }
}

function isFresh(data) {
  if (!data || !data.fetchedAt) return false;
  return new Date(data.fetchedAt).toDateString() === new Date().toDateString();
}

function initCurrency(math, onChange) {
  if (typeof window === 'undefined') return;
  ensureBaseUnit(math);
  const cached = loadCached();
  if (cached) registerRates(math, cached);
  if (isFresh(cached)) return;

  fetch(API_URL)
    .then(res => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    })
    .then(data => {
      save(data);
      registerRates(math, data);
      if (onChange) onChange();
    })
    .catch(() => {
      // offline: cached rates already applied
    });
}

export { registerRates };
export default initCurrency;
