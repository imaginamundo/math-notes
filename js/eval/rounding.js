import parseLine from '../core/parseLine.js';

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
const FRACTION = /^(.*\S)\s+(?:rounded\s+)?to\s+(?:the\s+)?nearest\s+(\d+)(?:st|nd|rd|th)$/i;
const NEAREST =
  /^(.*?\S)\s+(?:rounded\s+(up|down)\s+to|rounded\s+to|to)\s+(?:the\s+)?nearest\s+([A-Za-z]+|\d[\d,]*)$/i;
const WHOLE = /^(.*\S)\s+rounded(?:\s+(up|down))?$/i;

function preprocessRounding(expression) {
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
    return `fraction(round((${value}) * ${denominator}), ${denominator})`;
  }

  match = DECIMALS.exec(expression);
  if (match) {
    const [, value, places] = match;
    return `round(${value}, ${places})`;
  }

  match = NEAREST.exec(expression);
  if (match) {
    const [, value, direction, target] = match;
    const step = magnitude(target);
    if (step === null) return expression;
    return `${directionFn(direction)}((${value}) / ${step}) * ${step}`;
  }

  match = WHOLE.exec(expression);
  if (match) {
    const [, value, direction] = match;
    return `${directionFn(direction)}(${value})`;
  }

  return expression;
}

function directionFn(direction) {
  if (direction === 'up') return 'ceil';
  if (direction === 'down') return 'floor';
  return 'round';
}

function magnitude(token) {
  const word = token.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(MAGNITUDES, word)) return MAGNITUDES[word];
  const number = Number(token.replace(/,/g, ''));
  return Number.isFinite(number) && number > 0 ? number : null;
}

// mathjs rounds numbers, but its Unit overload wants a valueless unit to round
// in. Round the unit's own displayed value and rebuild it, so
// `round(4.567 m, 2)` is `4.57 m`.
function roundUnit(math, unit, decimals, mode) {
  const places = Number(decimals) || 0;
  const unitName = unit.formatUnits();
  const factor = 10 ** places;
  const scaled = unit.toNumber() * factor;
  const round = mode === 'ceil' ? Math.ceil : mode === 'floor' ? Math.floor : Math.round;
  return math.unit(round(scaled) / factor, unitName);
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

  const unitAware = (fn, mode) => (value, decimals, unit) => {
    if (value && value.isUnit === true && unit === undefined) {
      // A Unit second argument is mathjs's own `round(unit, valuelessUnit)`.
      if (!decimals || decimals.isUnit !== true) {
        return roundUnit(math, value, decimals, mode);
      }
    }
    return call(fn, value, decimals, unit);
  };

  math.import(
    {
      round: unitAware(round, 'round'),
      ceil: unitAware(ceil, 'ceil'),
      floor: unitAware(floor, 'floor'),
    },
    { override: true }
  );
}

export { preprocessRounding, initRounding };
export default initRounding;
