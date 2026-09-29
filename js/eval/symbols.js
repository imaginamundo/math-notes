import { CURRENCY_SYMBOLS, SYMBOL_SOURCE, isCurrencyCode } from '../core/currencySymbols.js';
import { BEFORE_WORD, AFTER_WORD, WORD } from '../core/identifiers.js';

// The boundaries keep a symbol from matching inside a word (`2 leite` must not
// read `lei`), while still allowing no space (`R$5`, `350usd`). A digit before
// the symbol is fine, so only letters/digits/underscore are rejected.
const SYMBOL_AFTER_NUMBER = new RegExp(`(\\d[\\d.]*)\\s*(${SYMBOL_SOURCE})(?![${WORD}_])`, 'gu');
const SYMBOL_BEFORE_NUMBER = new RegExp(`(?<![${WORD}_])(${SYMBOL_SOURCE})\\s*(\\d[\\d.]*)`, 'gu');

// Currency codes only become units in currency contexts (amounts and `to`/`in`
// conversions), so bare codes used as identifiers keep their case, e.g.
// `usd = 5` stays a variable assignment instead of `USD = 5`. The shared
// boundaries keep a name like `top10usd` intact while `10USD` and `USD 10`
// still rewrite.
const CODE = '[A-Za-z]{3}';
const CODE_AFTER_NUMBER = new RegExp(`${BEFORE_WORD}(\\d[\\d.]*)\\s*(${CODE})${AFTER_WORD}`, 'gu');
const CODE_BEFORE_NUMBER = new RegExp(`${BEFORE_WORD}(${CODE})\\s*(\\d[\\d.]*)`, 'gu');
const CODE_BEFORE_TO = new RegExp(`${BEFORE_WORD}(${CODE})(\\s+)to\\b`, 'giu');
const CODE_AFTER_TO = new RegExp(`\\bto(\\s+)(${CODE})${AFTER_WORD}`, 'giu');
const CODE_AFTER_IN = new RegExp(`\\bin(\\s+)(${CODE})${AFTER_WORD}`, 'giu');

// The codes that act as currency units live in core/currencySymbols.js, so the
// domain (aggregate/unitMix) and this evaluator read one vocabulary.

function preprocessSymbols(expression, context) {
  const names = context && context.names;
  return uppercaseCurrencyCodes(
    expression
      .replace(
        SYMBOL_AFTER_NUMBER,
        (match, number, symbol) => `${number} ${CURRENCY_SYMBOLS[symbol]}`
      )
      .replace(
        SYMBOL_BEFORE_NUMBER,
        (match, symbol, number) => `${number} ${CURRENCY_SYMBOLS[symbol]}`
      ),
    names
  );
}

function uppercaseCurrencyCodes(expression, names) {
  // A 3-letter token that is a variable must keep its case: `cad = 4` then
  // `2 cad` is the variable, not the Canadian dollar.
  const defined = (code) => Boolean(names && names.has(code));
  return (
    expression
      .replace(CODE_AFTER_NUMBER, (match, number, code) =>
        defined(code) ? match : `${number} ${uppercaseCode(code)}`
      )
      // A currency code before its amount is flipped so the amount leads
      // (`BRL 360 / 30 days` -> `360 BRL / 30 days`), which mathjs reads as the
      // rate `BRL/day` rather than `BRL * days`. Non-currency identifiers are
      // left alone.
      .replace(CODE_BEFORE_NUMBER, (match, code, number) =>
        !defined(code) && isCurrencyCode(code) ? `${number} ${uppercaseCode(code)}` : match
      )
      .replace(CODE_BEFORE_TO, (match, code, space) =>
        defined(code) ? match : `${uppercaseCode(code)}${space}to`
      )
      .replace(CODE_AFTER_TO, (match, space, code) =>
        defined(code) ? match : `to${space}${uppercaseCode(code)}`
      )
      .replace(CODE_AFTER_IN, (match, space, code) =>
        defined(code) ? match : `in${space}${uppercaseCode(code)}`
      )
  );
}

// Unknown identifiers keep their case, so `usd = 5` stays a variable.
function uppercaseCode(token) {
  const upper = token.toUpperCase();
  return isCurrencyCode(upper) ? upper : token;
}

export { preprocessSymbols };
