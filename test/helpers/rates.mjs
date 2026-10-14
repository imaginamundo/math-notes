import { CURRENCY_DISPLAY } from '../../js/core/currencySymbols.js';

// Fixed exchange rates for every currency the app knows, so sweeps never depend
// on the live feed. The values are arbitrary but distinct and non-trivial.
export const FIXTURE_RATES = {
  base: 'EUR',
  rates: Object.fromEntries(
    Object.keys(CURRENCY_DISPLAY).map((code, index) => [code, 1.05 + index * 0.37])
  ),
};
