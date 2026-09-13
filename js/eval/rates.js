import { trailingDimension } from '../core/measures.js';

// Rate phrasing on top of mathjs's compound units. mathjs already multiplies,
// adds and simplifies rates (`90 km / 3 day`); this only translates the words:
//   `$99 per week`                   -> 99 USD / week
//   `$24 a day for a year`           -> 24 USD / day * 1 year
//   `30 hours at $30/hour`           -> __rate(30 hours, 30 USD/hour)
//   `time to upload 3GB at 10 MB/s`  -> (3 GB) / (10 MB/s)
//   `5 km in 25 min`                 -> __pace(5 km, 25 min)

const TIME_TO = /^\s*time\s+to\s+\w+\s+(.+?)\s+at\s+(.+)$/i;
const PACE = /^(.+?)\s+in\s+(.+)$/i;
const AT = /^(.+\S)\s+at\s+(\S.+)$/i;
const FOR = /\s+for\s+(a|an|\d+(?:\.\d+)?)\s+([A-Za-zµ][A-Za-zµ0-9]*)\b/gi;
const PER = /\s+(?:per|a|an)\s+([A-Za-zµ][A-Za-zµ0-9]*)\b/gi;

function preprocessRates(expression) {
  let expr = expression.trim();

  const timeTo = TIME_TO.exec(expr);
  if (timeTo) return `(${timeTo[1]}) / (${timeTo[2]})`;

  const pace = PACE.exec(expr);
  if (pace && trailingDimension(pace[1]) === 'distance' && trailingDimension(pace[2]) === 'time') {
    // `min` is mathjs's min() function, not the minute unit.
    const time = pace[2].replace(/\bmin\b/gi, 'minutes');
    return `__pace((${pace[1]}), (${time}))`;
  }

  const at = AT.exec(expr);
  if (at) return `__rate((${at[1]}), (${at[2]}))`;

  expr = expr.replace(
    FOR,
    (match, amount, unit) => ` * ${amount === 'a' || amount === 'an' ? 1 : amount} ${unit}`
  );
  expr = expr.replace(PER, ' / $1');
  return expr;
}

function simplifyUnit(value) {
  if (value && value.isUnit === true && typeof value.simplify === 'function') {
    return value.simplify();
  }
  return value;
}

// `X at R`: keep whichever of X*R / X/R has the fewest unit factors. A rate of
// `km/hour` times hours gives a plain km, while km divided by it gives hours.
function rate(math, left, right) {
  const candidates = [];
  try {
    candidates.push(math.multiply(left, right));
  } catch {
    // not multiplyable
  }
  try {
    candidates.push(math.divide(left, right));
  } catch {
    // not divisible
  }

  let best = null;
  let bestCount = Infinity;
  for (const candidate of candidates) {
    const simple = simplifyUnit(candidate);
    const count = simple && simple.isUnit === true ? simple.units.length : 0;
    if (count < bestCount) {
      best = simple;
      bestCount = count;
    }
  }
  if (best === null) throw new Error('Cannot combine these rates');
  return best;
}

// `5 km in 25 min` -> minutes per km (or per mile), formatted as mm:ss.
function pace(math, distance, time) {
  const rateValue = simplifyUnit(math.divide(time, distance));
  const units = distance && distance.formatUnits ? distance.formatUnits() : '';
  const target = /mi|mile/i.test(units) ? 'min/mi' : 'min/km';
  return rateValue.to(target);
}

function initRates(math) {
  math.import(
    {
      __rate: (left, right) => rate(math, left, right),
      __pace: (distance, time) => pace(math, distance, time),
    },
    { override: true }
  );
}

export { preprocessRates, initRates };
export default initRates;
