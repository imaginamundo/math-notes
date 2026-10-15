import { DIMENSIONS } from './measures.js';
import { currencyCodes, CURRENCY_SYMBOLS } from './currencySymbols.js';

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
  ['now', 'current time'],
  ['yesterday', "today's date minus a day"],
  ['tomorrow', "today's date plus a day"],
  ['per', 'rate division'],
  ['at', 'rate: distance at speed, or amount at price'],
  ['for', 'multiply by a duration'],
  ['in', 'convert to a unit'],
  ['to', 'convert to a unit'],
  ['as', 'convert or format'],
  ['rounded', 'round the result'],
  ['nearest', 'round to a multiple'],
  ['workdays', 'Monday to Friday'],
  ['weekday', 'day of the week (weekday on March 9)'],
  ['christmas', 'a date, 25 December'],
  ['halloween', 'a date, 31 October'],
  ['unit', 'define your own unit: unit box = 12'],
  ['timespan', 'show a duration as parts (5.5 min as timespan)'],
];

const FUNCTIONS = [
  ['sqrt', 'square root'],
  ['cbrt', 'cube root'],
  ['root', 'nth root'],
  ['abs', 'absolute value'],
  ['round', 'round to nearest'],
  ['ceil', 'round up'],
  ['floor', 'round down'],
  ['fix', 'drop the fraction'],
  ['sign', 'sign of a number'],
  ['min', 'smallest value'],
  ['max', 'largest value'],
  ['sum', 'add a list'],
  ['mean', 'average of a list'],
  ['median', 'middle of a list'],
  ['count', 'number of items in a list'],
  ['exp', 'e raised to the power'],
  ['log', 'natural logarithm (log(x, base) for another base)'],
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
  ['size', 'size of a list'],
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
    // The app's keywords win over a same-named maths function (`sum`). A unit may share
    // its spelling with one (`min`, `in`): after a number only the unit is offered.
    const key = kind === 'unit' ? `unit:${text}` : text;
    if (seen.has(key)) return;
    seen.add(key);
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
  for (const code of currencyCodes()) names.add(code);
  for (const symbol of Object.keys(CURRENCY_SYMBOLS)) names.add(symbol);
  // Units outside the cooking and measuring families that the reference documents.
  const others = [
    ...['degC', 'degF', 'K', 'kelvin', 'J', 'W', 'watt', 'hp', 'Pa', 'psi', 'atm', 'bar', 'torr'],
    ...[
      'acre',
      'hectare',
      'sqft',
      'sqin',
      'sqm',
      'cuft',
      'Hz',
      'hertz',
      'N',
      'newton',
      'V',
      'volt',
    ],
    ...['ohm', 'A', 'amp', 'mol', 'rad', 'deg', 'kn', 'knot', 'nmi'],
  ];
  for (const unit of [...others, 'px', 'em', 'point']) names.add(unit);
  return [...names].sort((a, b) => a.localeCompare(b));
}

// Built once: the vocabulary never changes at runtime.
const VOCABULARY = entries();

export { VOCABULARY };
