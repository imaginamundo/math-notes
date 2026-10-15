import { trailingDimension, unitDimension } from '../core/measures.js';
import { simplifyLocal } from '../core/unitSimplify.js';

// Rate phrasing on top of mathjs's compound units. mathjs already multiplies,
// adds and simplifies rates (`90 km / 3 day`); this only translates the words:
//   `$99 per week`                   -> 99 USD / week
//   `$24 a day for a year`           -> 24 USD / day * 1 year
//   `30 hours at $30/hour`           -> __rate(30 hours, 30 USD/hour)
//   `time to upload 3GB at 10 MB/s`  -> (3 GB) / (10 MB/s)
//   `5 km in 25 min`                 -> __pace(5 km, 25 min)

// The verb is optional (`time to upload 3 GB at …`, `time to 100 km at …`); a number
// is never a verb, or the amount's own number was dropped and the time came out for 1.
const TIME_TO = /^\s*time\s+to\s+(?:[A-Za-z]\w*\s+)?(.+?)\s+at\s+(.+)$/i;
const PACE = /^(.+?)\s+in\s+(.+)$/i;
// `at` between two operands of any length (`5 at 25`, `x at 3`); with a two-character
// minimum mathjs read a one-character operand's `at` as the unit attotonne.
const AT = /^(.*\S)\s+at\s+(\S.*)$/i;
const FOR = /\s+for\s+(a|an|\d+(?:\.\d+)?)\s+([A-Za-zµ][A-Za-zµ0-9]*)\b/gi;
// `per` in any case, but `a`/`an` only in lowercase (a capital `A` is the ampere,
// `3 A h`), and never before a conversion word (`10 a to m`).
const PER = /\s+([Pp][Ee][Rr]|a|an)\s+(?!(?:to|as|in)\b)([A-Za-zµ][A-Za-zµ0-9]*)\b/g;

// `8 hours a day`, `3 hours per day`, `8 hours a day for a week`: both units measure the same
// thing, so dividing would cancel to a bare number (0.333). In these phrases the user is naming a
// rate, so it is kept as one (`8 hours/day`); an explicit `/` is still a ratio.
const SAME_KIND_RATE = /^(.*\S)\s+(?:[Pp][Ee][Rr]|a|an)\s+([A-Za-zµ][A-Za-zµ0-9]*)$/;
const SAME_KIND_RATE_FOR =
  /^(.*\S)\s+(?:[Pp][Ee][Rr]|a|an)\s+([A-Za-zµ][A-Za-zµ0-9]*)\s+for\s+(a|an|\d+(?:\.\d+)?)\s+([A-Za-zµ][A-Za-zµ0-9]*)$/;

function sameKind(quantity, unit) {
  const dimension = trailingDimension(quantity);
  return dimension !== null && dimension === unitDimension(unit);
}

function preprocessRates(expression, context) {
  const names = context && context.names;
  let expr = expression.trim();

  const rateFor = SAME_KIND_RATE_FOR.exec(expr);
  if (rateFor && sameKind(rateFor[1], rateFor[2]) && sameKind(rateFor[1], rateFor[4])) {
    const amount = rateFor[3] === 'a' || rateFor[3] === 'an' ? 1 : rateFor[3];
    return `__rateFor((${rateFor[1]}), "${rateFor[2]}", ${amount}, "${rateFor[4]}")`;
  }
  const sameRate = SAME_KIND_RATE.exec(expr);
  if (sameRate && sameKind(sameRate[1], sameRate[2])) {
    return `__rateUnit((${sameRate[1]}), "${sameRate[2]}")`;
  }

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
  expr = expr.replace(PER, (match, connector, unit) => {
    // `a`/`an` between two variables is not a rate (`x a y`); only `per` always
    // means division.
    // A variable named `a` or `an` is a variable too (`x = a mod 3`).
    if (connector.toLowerCase() !== 'per' && names && (names.has(unit) || names.has(connector))) {
      return match;
    }
    return ` / ${unit}`;
  });
  return expr;
}

function simplifyUnit(value) {
  return simplifyLocal(value);
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
      // `8 hours a day`: the quantity per one of the unit, kept as a compound unit.
      __rateUnit: (quantity, per) => {
        const written = quantity.formatUnits();
        const amount = quantity.toNumber(written);
        return math.unit(`${amount} ${written}/${per}`);
      },
      // `8 hours a day for a week`: that rate over an amount of the denominator's kind.
      __rateFor: (quantity, per, amount, span) => {
        const written = quantity.formatUnits();
        const perDay = quantity.toNumber(written);
        const count = math.unit(Number(amount), span).toNumber(per);
        return math.unit(perDay * count, written);
      },
    },
    { override: true }
  );
}

export { preprocessRates, initRates };
export default initRates;
