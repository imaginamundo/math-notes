import parseLine from '../core/parseLine.js';
import { normalizeUnit } from '../core/unitForm.js';

// Soulver-style rounding phrases:
//   `1/3 to 2 dp`, `pi to 5 digits`        -> round(x, n)
//   `5.5 rounded`, `rounded up`, `rounded down`
//   `37 to nearest 10`, `rounded to nearest hundred`
//   `21 rounded up to nearest 5`
//   `0.534 to nearest 16th`                -> a Fraction
//
// The phrases are rewritten to the mathjs round/ceil/floor functions, which
// initRounding makes unit-aware. Phrases run last, after the other
// preprocessors, so the value being rounded is already normalised.

const MAGNITUDES = {
  ten: 10,
  hundred: 100,
  thousand: 1000,
  million: 1e6,
  billion: 1e9,
  trillion: 1e12,
};

const DECIMALS = /^(.*\S)\s+to\s+(\d+)\s*(?:dps?|digits?|decimals?|decimal\s+places?)$/i;
const FRACTION = /^(.*?\S)\s+(?:rounded\s+)?to\s+(?:the\s+)?nearest\s+(\d+)(?:st|nd|rd|th)$/i;
// The step is a magnitude word (`hundred`) or a number, which may carry its own
// unit (`nearest 15 minutes`, `nearest 5 cm`).
const NEAREST =
  /^(.*?\S)\s+(?:rounded\s+(up|down)\s+to|rounded\s+to|to)\s+(?:the\s+)?nearest\s+([A-Za-z]+|\d[\d,]*(?:\.\d+)?)(?:\s+([A-Za-z$€£]+))?$/i;
const WHOLE = /^(.*\S)\s+rounded(?:\s+(up|down))?$/i;

function preprocessRounding(expression, context) {
  // A variable named `rounded` is the user's, not a phrase.
  const names = context && context.names;
  if (names && names.has('rounded') && /\brounded\b/i.test(expression)) return expression;
  // An assignment rounds its right-hand side: `x = 5.5 rounded` must not wrap
  // the `x =` part in the call.
  const parsed = parseLine(expression);
  if (parsed.isAssignment && parsed.rhs) {
    const rewritten = rewrite(parsed.rhs);
    return rewritten === parsed.rhs ? expression : `${parsed.label} = ${rewritten}`;
  }
  return rewrite(expression);
}

function rewrite(expression) {
  let match = FRACTION.exec(expression);
  if (match) {
    const [, value, denominator] = match;
    return `__fractionRound(${value}, ${denominator})`;
  }

  match = DECIMALS.exec(expression);
  if (match) {
    const [, value, places] = match;
    return `__round(${value}, ${places})`;
  }

  match = NEAREST.exec(expression);
  if (match) {
    const [, value, direction, target, unit] = match;
    const amount = magnitude(target);
    if (amount === null) return expression;
    // A step with its own unit is a quantity (`15 minutes`), and the ratio of the
    // two does not depend on what unit the value is written in. A bare step is
    // read in the value's own unit, and a duration written in several units
    // (`2 hours 17 minutes`) is first expressed in the smallest one it names, so
    // the step is not read in hours (NUM-05).
    const step = unit ? `(${amount} ${unit})` : amount;
    const rounded = unit ? value : inSmallestTimeUnit(value);
    return `${directionFn(direction)}((${rounded}) / ${step}) * ${step}`;
  }

  match = WHOLE.exec(expression);
  if (match) {
    const [, value, direction] = match;
    return `${directionFn(direction)}(${value})`;
  }

  return expression;
}

// The time units a duration can be written in, smallest first, with the plural
// name mathjs accepts for each.
const TIME_UNITS = [
  ['milliseconds', ['ms', 'millisecond', 'milliseconds']],
  ['seconds', ['s', 'sec', 'secs', 'second', 'seconds']],
  ['minutes', ['m', 'min', 'mins', 'minute', 'minutes']],
  ['hours', ['h', 'hr', 'hrs', 'hour', 'hours']],
  ['days', ['d', 'day', 'days']],
  ['weeks', ['w', 'week', 'weeks']],
  ['months', ['mo', 'month', 'months']],
  ['years', ['y', 'yr', 'yrs', 'year', 'years']],
];
const TIME_TOKEN = /(\d*\.?\d+)\s*([A-Za-z]+)/g;

// `(2 hours + 17 minutes)` → `((2 hours + 17 minutes) to minutes)`: a value made of
// two or more time units, expressed in the smallest of them. Anything else (one
// unit, or a quantity with other units in it) is returned unchanged.
function inSmallestTimeUnit(value) {
  const found = [];
  for (const [, amount, token] of value.matchAll(TIME_TOKEN)) {
    const index = TIME_UNITS.findIndex(([, names]) => names.includes(token.toLowerCase()));
    if (index === -1) return value;
    found.push({ amount, index });
  }
  if (found.length < 2 || new Set(found.map((entry) => entry.index)).size < 2) return value;
  const smallest = Math.min(...found.map((entry) => entry.index));
  return `(${value}) to ${TIME_UNITS[smallest][0]}`;
}

// The rewrites call these, not `round`/`ceil`/`floor`, which a variable of that name
// would capture (`round = 45`, then `5.5 rounded`).
function directionFn(direction) {
  if (direction === 'up') return '__ceil';
  if (direction === 'down') return '__floor';
  return '__round';
}

function magnitude(token) {
  const word = token.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(MAGNITUDES, word)) return MAGNITUDES[word];
  const number = Number(token.replace(/,/g, ''));
  return Number.isFinite(number) && number > 0 ? number : null;
}

// mathjs rounds numbers, but its Unit overload wants a valueless unit to round
// in. Round the unit's own displayed value and rebuild it, so
// `round(4.567 m, 2)` is `4.57 m`. A compound that cancels to one unit is reduced
// first (`$24 a day for a year` is US$ 8,766, not 24), and the rounding is mathjs's
// own `round`/`ceil`/`floor` on the number, so halves, negatives and values a hair
// off a whole number behave exactly as they do for a plain number (REVIEW.md
// NUM-07, MIX-01). The timespan marker is carried over, or a rounded duration would
// stop being drawn as one.
function roundUnit(math, unit, decimals, round) {
  const source = normalizeUnit(unit);
  const places = Number(decimals) || 0;
  const number = source.toNumber();
  const rounded = places ? round(number, places) : round(number);
  const result = math.unit(rounded, source.formatUnits());
  if (source.timespan === true) result.timespan = true;
  if (source.keepUnit === true) result.keepUnit = true;
  return result;
}

// Extend mathjs's round/ceil/floor with the Unit overload the phrases need,
// delegating every other call (numbers, matrices, explicit valueless units) to
// the originals.
function initRounding(math) {
  if (typeof math.round !== 'function') return;
  const round = math.round;
  const ceil = math.ceil;
  const floor = math.floor;

  const call = (fn, value, decimals, unit) => {
    if (unit !== undefined) return fn(value, decimals, unit);
    if (decimals !== undefined) return fn(value, decimals);
    return fn(value);
  };

  const unitAware = (fn) => (value, decimals, unit) => {
    if (value && value.isUnit === true && unit === undefined) {
      // A Unit second argument is mathjs's own `round(unit, valuelessUnit)`.
      if (!decimals || decimals.isUnit !== true) {
        return roundUnit(math, value, decimals, fn);
      }
    }
    return call(fn, value, decimals, unit);
  };

  const fraction = math.fraction;

  // `to nearest 16th`: a plain number becomes a Fraction. A unit or currency is
  // rounded to the nearest 1/d in its own unit and keeps the exact numerator and
  // denominator, so it can be drawn as `37/16 in` rather than `2.313… in` (NUM-06).
  const fractionRound = (value, denominator) => {
    if (value && value.isUnit === true) {
      const source = normalizeUnit(value);
      const numerator = round(source.toNumber() * denominator);
      const result = math.unit(numerator / denominator, source.formatUnits());
      result.fractionParts = { numerator, denominator };
      return result;
    }
    return fraction(round(value * denominator), denominator);
  };

  math.import(
    {
      __fractionRound: fractionRound,
      __round: unitAware(round),
      __ceil: unitAware(ceil),
      __floor: unitAware(floor),
      round: unitAware(round),
      ceil: unitAware(ceil),
      floor: unitAware(floor),
    },
    { override: true }
  );
}

export { preprocessRounding, initRounding };
export default initRounding;
