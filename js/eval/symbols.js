const CURRENCY_SYMBOLS = {
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
  '₺': 'TRY',
  '₩': 'KRW',
  R$: 'BRL',
};

const CURRENCY_CODES = new Set([
  'AUD',
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

const SYMBOLS = Object.keys(CURRENCY_SYMBOLS).sort((a, b) => b.length - a.length);
const SYMBOL_SOURCE = SYMBOLS.map((symbol) => symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(
  '|'
);
const SYMBOL_AFTER_NUMBER = new RegExp(`(\\d[\\d.]*)\\s*(${SYMBOL_SOURCE})`, 'g');
const SYMBOL_BEFORE_NUMBER = new RegExp(`(${SYMBOL_SOURCE})\\s*(\\d[\\d.]*)`, 'g');

// Currency codes only become units in currency contexts (amounts and `to`/`in`
// conversions), so bare codes used as identifiers keep their case, e.g.
// `usd = 5` stays a variable assignment instead of `USD = 5`.
const CODE = '[A-Za-z]{3}';
const CODE_AFTER_NUMBER = new RegExp(`(\\d[\\d.]*)\\s*(${CODE})(?!\\w)`, 'g');
const CODE_BEFORE_NUMBER = new RegExp(`(?<![\\w.])(${CODE})\\s*(\\d[\\d.]*)`, 'g');
const CODE_BEFORE_TO = new RegExp(`(?<![\\w.])(${CODE})(\\s+)to\\b`, 'gi');
const CODE_AFTER_TO = new RegExp(`\\bto(\\s+)(${CODE})(?!\\w)`, 'gi');
const CODE_AFTER_IN = new RegExp(`\\bin(\\s+)(${CODE})(?!\\w)`, 'gi');

function preprocessSymbols(expression) {
  return uppercaseCurrencyCodes(
    expression
      .replace(
        SYMBOL_AFTER_NUMBER,
        (match, number, symbol) => `${number} ${CURRENCY_SYMBOLS[symbol]}`
      )
      .replace(
        SYMBOL_BEFORE_NUMBER,
        (match, symbol, number) => `${number} ${CURRENCY_SYMBOLS[symbol]}`
      )
  );
}

function uppercaseCurrencyCodes(expression) {
  return expression
    .replace(CODE_AFTER_NUMBER, (match, number, code) => `${number} ${uppercaseCode(code)}`)
    .replace(CODE_BEFORE_NUMBER, (match, code, number) => `${uppercaseCode(code)} ${number}`)
    .replace(CODE_BEFORE_TO, (match, code, space) => `${uppercaseCode(code)}${space}to`)
    .replace(CODE_AFTER_TO, (match, space, code) => `to${space}${uppercaseCode(code)}`)
    .replace(CODE_AFTER_IN, (match, space, code) => `in${space}${uppercaseCode(code)}`);
}

function uppercaseCode(token) {
  const upper = token.toUpperCase();
  return CURRENCY_CODES.has(upper) ? upper : token;
}

export { CURRENCY_SYMBOLS, CURRENCY_CODES, SYMBOL_SOURCE, preprocessSymbols };
