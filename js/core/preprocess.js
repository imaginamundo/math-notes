import { preprocessSymbols } from '../eval/symbols.js';
import { preprocessScales } from '../eval/scales.js';
import { preprocessPercent } from '../eval/percentage.js';
import { preprocessWordOps } from '../eval/wordOperators.js';
import { preprocessRounding } from '../eval/rounding.js';

// Applied in order. Scales must run before currency so `$2k` expands to
// `2000 USD`; percentage before word operators so its `of|on|off` phrases
// are consumed first; rounding last, so it wraps the normalised value.
const STEPS = [
  preprocessScales,
  preprocessSymbols,
  preprocessPercent,
  preprocessWordOps,
  preprocessRounding,
];

function preprocess(expression) {
  return STEPS.reduce((result, step) => step(result), expression);
}

export { STEPS };
export default preprocess;
