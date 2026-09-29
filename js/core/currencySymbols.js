// Static lexing data for currency *symbols* ($, €, R$ …). Pure data with no
// logic or side effects, shared by the evaluator's preprocessor and the syntax
// highlighter so neither imports the other's layer. It also owns the live set
// of known currency *codes*, so the domain (aggregate/unitMix) and the
// evaluator both read the vocabulary from here rather than the domain reaching
// into `eval/`.

// How each currency is written back: a symbol in front of the amount
// (`350usd` -> `US$350`). Currencies with no distinct symbol (CHF, ZAR, the
// Nordic krona) are absent and keep their ISO code instead, so the result can
// always be typed back in.
const CURRENCY_DISPLAY = {
  USD: 'US$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: 'CN¥',
  AUD: 'A$',
  CAD: 'CA$',
  HKD: 'HK$',
  NZD: 'NZ$',
  SGD: 'S$',
  INR: '₹',
  KRW: '₩',
  TRY: '₺',
  BRL: 'R$',
  MXN: 'MX$',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  IDR: 'Rp',
  MYR: 'RM',
  PHP: '₱',
  THB: '฿',
  ILS: '₪',
};

// Symbols accepted in place of a currency code. The inverse of CURRENCY_DISPLAY
// plus the bare `$`, which is common shorthand for USD.
const CURRENCY_SYMBOLS = {
  $: 'USD',
  US$: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  'CN¥': 'CNY',
  '₹': 'INR',
  '₺': 'TRY',
  '₩': 'KRW',
  R$: 'BRL',
  A$: 'AUD',
  CA$: 'CAD',
  HK$: 'HKD',
  NZ$: 'NZD',
  S$: 'SGD',
  MX$: 'MXN',
  '₱': 'PHP',
  '฿': 'THB',
  '₪': 'ILS',
  zł: 'PLN',
  Kč: 'CZK',
  Ft: 'HUF',
  Rp: 'IDR',
  RM: 'MYR',
  lei: 'RON',
};

const SYMBOLS = Object.keys(CURRENCY_SYMBOLS).sort((a, b) => b.length - a.length);
const SYMBOL_SOURCE = SYMBOLS.map((symbol) => symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(
  '|'
);

// The ISO codes the app treats as currencies (the ECB reference set the rate
// API returns). A fixed vocabulary rather than one that grows as rates are
// registered, so the recognizer is the same for every engine instance.
const CURRENCY_CODES = new Set([
  'AUD',
  'BGN',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'ISK',
  'JPY',
  'KRW',
  'MXN',
  'MYR',
  'NOK',
  'NZD',
  'PHP',
  'PLN',
  'RON',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'USD',
  'ZAR',
]);

function isCurrencyCode(code) {
  return CURRENCY_CODES.has(String(code).toUpperCase());
}

export { CURRENCY_SYMBOLS, CURRENCY_DISPLAY, SYMBOL_SOURCE, isCurrencyCode };
