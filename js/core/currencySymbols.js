// Static lexing data for currency *symbols* ($, €, R$ …). Pure data with no
// logic or side effects, shared by the evaluator's preprocessor and the syntax
// highlighter so neither imports the other's layer.

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

const SYMBOLS = Object.keys(CURRENCY_SYMBOLS).sort((a, b) => b.length - a.length);
const SYMBOL_SOURCE = SYMBOLS.map((symbol) => symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(
  '|'
);

export { CURRENCY_SYMBOLS, SYMBOL_SOURCE };
