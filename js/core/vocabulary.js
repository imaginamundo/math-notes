import { DIMENSIONS } from './measures.js';
import { CURRENCY_DISPLAY, CURRENCY_SYMBOLS } from './currencySymbols.js';

// Names the autocomplete offers beyond the user's own variables. Pure data:
// each entry is `{ text, kind, detail? }`, where `kind` orders the suggestions
// (variables first, then keywords, functions, constants and units) and `detail`
// is the short hint shown beside the name.

const KEYWORDS = [
  ['prev', 'the previous result'],
  ['sum', 'total of the block above'],
  ['total', 'total of the block above'],
  ['average', 'mean of the block above'],
  ['avg', 'mean of the block above'],
  ['end', 'close a group'],
  ['today', 'current date'],
  ['now', 'current date and time'],
  ['yesterday', "today's date minus a day"],
  ['tomorrow', "today's date plus a day"],
  ['per', 'rate division'],
  ['at', 'rate multiplication'],
  ['for', 'multiply by a duration'],
  ['in', 'convert to a unit'],
  ['to', 'convert to a unit'],
  ['as', 'convert or format'],
  ['rounded', 'round the result'],
  ['nearest', 'round to a multiple'],
  ['workdays', 'Monday to Friday'],
  ['weekday', 'day of the week'],
];

const FUNCTIONS = [
  ['sqrt', 'square root'],
  ['cbrt', 'cube root'],
  ['root', 'nth root'],
  ['abs', 'absolute value'],
  ['round', 'round to nearest'],
  ['ceil', 'round up'],
  ['floor', 'round down'],
  ['trunc', 'drop the fraction'],
  ['sign', 'sign of a number'],
  ['min', 'smallest value'],
  ['max', 'largest value'],
  ['sum', 'add a list'],
  ['mean', 'average of a list'],
  ['median', 'middle of a list'],
  ['count', 'number of items'],
  ['exp', 'e raised to the power'],
  ['log', 'logarithm base 10'],
  ['log10', 'logarithm base 10'],
  ['log2', 'logarithm base 2'],
  ['ln', 'natural logarithm'],
  ['pow', 'raise to a power'],
  ['mod', 'remainder'],
  ['gcd', 'greatest common divisor'],
  ['lcm', 'least common multiple'],
  ['sin', 'sine'],
  ['cos', 'cosine'],
  ['tan', 'tangent'],
  ['asin', 'inverse sine'],
  ['acos', 'inverse cosine'],
  ['atan', 'inverse tangent'],
  ['fact', 'factorial'],
  ['combinations', 'ways to choose'],
  ['random', 'random number'],
  ['concat', 'join lists'],
  ['sort', 'order a list'],
  ['length', 'size of a list'],
  ['line', "reference an earlier line's value"],
  ['fromunix', 'date from a unix timestamp'],
  ['unix', 'unix timestamp now'],
];

const CONSTANTS = [
  ['pi', '3.14159…'],
  ['π', '3.14159…'],
  ['e', "Euler's number"],
  ['tau', '2π'],
  ['i', 'imaginary unit'],
  ['Infinity', 'a number larger than any other'],
];

function entries() {
  const list = [];
  const seen = new Set();
  const push = (text, kind, detail) => {
    // The app's keywords win over a same-named maths function (`sum`).
    if (seen.has(text)) return;
    seen.add(text);
    list.push({ text, kind, detail });
  };
  for (const [text, detail] of KEYWORDS) push(text, 'keyword', detail);
  for (const [text, detail] of FUNCTIONS) push(text, 'function', detail);
  for (const [text, detail] of CONSTANTS) push(text, 'constant', detail);
  for (const unit of units()) push(unit, 'unit', undefined);
  return list;
}

function units() {
  const names = new Set();
  for (const dimension of Object.values(DIMENSIONS)) {
    for (const unit of dimension) names.add(unit);
  }
  for (const code of Object.keys(CURRENCY_DISPLAY)) names.add(code);
  for (const symbol of Object.keys(CURRENCY_SYMBOLS)) names.add(symbol);
  for (const unit of ['px', 'em', 'point']) names.add(unit);
  return [...names].sort((a, b) => a.localeCompare(b));
}

// Built once: the vocabulary never changes at runtime.
const VOCABULARY = entries();

export { VOCABULARY };
