const BASE = 'EUR';
const API_URL = 'https://api.frankfurter.dev/v1/latest?from=' + BASE;
const STORAGE_KEY = 'math-notes-currency-rates';

const CURRENCY_SYMBOLS = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
  '₺': 'TRY',
  '₩': 'KRW',
  'R$': 'BRL',
};

const CURRENCY_CODES = new Set([
  'AUD', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD',
  'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK',
  'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR',
]);

const SYMBOLS = Object.keys(CURRENCY_SYMBOLS).sort((a, b) => b.length - a.length);
const SYMBOL_SOURCE = SYMBOLS.map(symbol => symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const SYMBOL_AFTER_NUMBER = new RegExp(`(\\d[\\d.]*)\\s*(${SYMBOL_SOURCE})`, 'g');
const SYMBOL_BEFORE_NUMBER = new RegExp(`(${SYMBOL_SOURCE})\\s*(\\d[\\d.]*)`, 'g');
const CODE_PATTERN = /[A-Za-z]{3}/g;

function preprocessSymbols(expression) {
  return uppercaseCurrencyCodes(expression
    .replace(SYMBOL_AFTER_NUMBER, (match, number, symbol) => `${number} ${CURRENCY_SYMBOLS[symbol]}`)
    .replace(SYMBOL_BEFORE_NUMBER, (match, symbol, number) => `${number} ${CURRENCY_SYMBOLS[symbol]}`));
}

function uppercaseCurrencyCodes(expression) {
  return expression.replace(CODE_PATTERN, (token, offset) => {
    const upper = token.toUpperCase();
    if (!CURRENCY_CODES.has(upper)) return token;
    const before = expression[offset - 1];
    const after = expression[offset + 3];
    if (before && /[A-Za-z]/.test(before)) return token;
    if (after && /[A-Za-z]/.test(after)) return token;
    const prefix = before && /[0-9]/.test(before) ? ' ' : '';
    const suffix = after && /[0-9]/.test(after) ? ' ' : '';
    return prefix + upper + suffix;
  });
}

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

export { preprocessSymbols, registerRates, CURRENCY_SYMBOLS };
export default initCurrency;
