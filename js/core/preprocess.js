import { preprocessSymbols } from '../eval/symbols.js';
import { preprocessScales } from '../eval/scales.js';
import { preprocessPercent } from '../eval/percentage.js';
import { preprocessWordOps } from '../eval/wordOperators.js';
import { preprocessMeasures } from '../eval/measures.js';
import { preprocessRates } from '../eval/rates.js';
import { preprocessCalendar } from '../eval/calendar.js';
import { preprocessTimespan } from '../eval/timespan.js';
import { preprocessRounding } from '../eval/rounding.js';

// Applied in order. Measures run first so a scale-like subject (`4k video`) is
// recognised before `scales` rewrites it. Scales before currency so `$2k`
// expands to `2000 USD`; percentage before word operators so its `of|on|off`
// phrases are consumed first; calendar before timespans so a date's `as`
// pattern is not read as a conversion; rounding last, so it wraps the
// normalised value.
//
// `context` is passed to every step (most ignore it); the currency step uses
// `context.names` to leave a code that is a defined variable alone.
const STEPS = [
  preprocessMeasures,
  preprocessScales,
  preprocessSymbols,
  preprocessPercent,
  preprocessWordOps,
  preprocessRates,
  preprocessCalendar,
  preprocessTimespan,
  preprocessRounding,
];

function preprocess(expression, context) {
  return STEPS.reduce((result, step) => step(result, context), expression);
}

export { STEPS };
export default preprocess;
