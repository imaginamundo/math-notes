import { CURRENCY_SYMBOLS, SYMBOL_SOURCE, isCurrencyCode } from '../core/currencySymbols.js';

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

// The codes that act as currency units live in core/currencySymbols.js, so the
// domain (aggregate/unitMix) and this evaluator read one vocabulary.

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
  return (
    expression
      .replace(CODE_AFTER_NUMBER, (match, number, code) => `${number} ${uppercaseCode(code)}`)
      // A currency code before its amount is flipped so the amount leads
      // (`BRL 360 / 30 days` -> `360 BRL / 30 days`), which mathjs reads as the
      // rate `BRL/day` rather than `BRL * days`. Non-currency identifiers are
      // left alone.
      .replace(CODE_BEFORE_NUMBER, (match, code, number) =>
        isCurrencyCode(code) ? `${number} ${uppercaseCode(code)}` : match
      )
      .replace(CODE_BEFORE_TO, (match, code, space) => `${uppercaseCode(code)}${space}to`)
      .replace(CODE_AFTER_TO, (match, space, code) => `to${space}${uppercaseCode(code)}`)
      .replace(CODE_AFTER_IN, (match, space, code) => `in${space}${uppercaseCode(code)}`)
  );
}

// Unknown identifiers keep their case, so `usd = 5` stays a variable.
function uppercaseCode(token) {
  const upper = token.toUpperCase();
  return isCurrencyCode(upper) ? upper : token;
}

export { preprocessSymbols };
