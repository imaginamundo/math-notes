import { preprocessSymbols } from '../eval/symbols.js';
import { preprocessScales } from '../eval/scales.js';
import { preprocessPercent } from '../eval/percentage.js';
import { preprocessWordOps } from '../eval/wordOperators.js';
import { preprocessMeasures } from '../eval/measures.js';
import { preprocessRates } from '../eval/rates.js';
import { preprocessRounding } from '../eval/rounding.js';

// Applied in order. Measures run first so a scale-like subject (`4k video`) is
// recognised before `scales` rewrites it. Scales before currency so `$2k`
// expands to `2000 USD`; percentage before word operators so its `of|on|off`
// phrases are consumed first; rates after word operators; rounding last, so it
// wraps the normalised value.
const STEPS = [
  preprocessMeasures,
  preprocessScales,
  preprocessSymbols,
  preprocessPercent,
  preprocessWordOps,
  preprocessRates,
  preprocessRounding,
];

function preprocess(expression) {
  return STEPS.reduce((result, step) => step(result), expression);
}

export { STEPS };
export default preprocess;
