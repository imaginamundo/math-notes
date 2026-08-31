import { preprocessSymbols } from './symbols.js';
import { preprocessScales } from './scales.js';
import { preprocessPercent } from './percentage.js';
import { preprocessWordOps } from './wordOperators.js';

// Applied in order. Scales must run before currency so `$2k` expands to
// `2000 USD`; percentage before word operators so its `of|on|off` phrases
// are consumed first.
const STEPS = [
  preprocessScales,
  preprocessSymbols,
  preprocessPercent,
  preprocessWordOps,
];

function preprocess(expression) {
  return STEPS.reduce((result, step) => step(result), expression);
}

export { STEPS };
export default preprocess;
