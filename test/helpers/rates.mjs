import { CURRENCY_DISPLAY, currencyCodes } from '../../js/core/currencySymbols.js';

// Fixed exchange rates for every currency the app knows, so sweeps never depend
// on the live feed. The values are arbitrary but distinct and non-trivial. The codes
// with a symbol come first, so adding a code never moves another code's rate.
const CODES = [
  ...Object.keys(CURRENCY_DISPLAY),
  ...currencyCodes().filter((code) => !(code in CURRENCY_DISPLAY)),
];
export const FIXTURE_RATES = {
  base: 'EUR',
  rates: Object.fromEntries(CODES.map((code, index) => [code, 1.05 + index * 0.37])),
};
