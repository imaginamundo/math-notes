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

export { CURRENCY_SYMBOLS, CURRENCY_CODES, SYMBOL_SOURCE, preprocessSymbols };
