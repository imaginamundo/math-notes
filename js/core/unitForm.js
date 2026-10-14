import { isCurrencyCode } from './currencySymbols.js';
import { simplifyLocal } from './unitSimplify.js';

// Helpers for reading a mathjs Unit by its factors, shared by the engine (which
// normalises compound results when they are stored) and the renderer (which draws
// them).

/** The number a unit holds in the unit it is written in, falling back to its raw value. */
export function numericValue(unit) {
  try {
    return unit.toNumber();
  } catch {
    return unit.value;
  }
}

/**
 * Express a unit in a currency, so a reduced compound keeps the currency the user
 * wrote instead of mathjs's base currency.
 */
export function convertTo(unit, code) {
  try {
    return unit.toNumber(code);
  } catch {
    return numericValue(unit);
  }
}

/**
 * The currency code when the unit has exactly one currency factor, on top (`USD`,
 * `USD/hour`, `(h USD)/hour`), else null.
 */
export function leadingCurrency(unit) {
  let code = null;
  for (const entry of unit.units) {
    if (!isCurrencyCode(entry.unit.name)) continue;
    if (code || entry.power !== 1 || (entry.prefix && entry.prefix.name)) return null;
    code = entry.unit.name;
  }
  return code;
}

const isSingleUnit = (unit) => unit.units.length === 1 && unit.units[0].power === 1;

/**
 * The currency a plain amount of money is in: `USD` for `5 USD`, and for a custom
 * unit defined from money (`unit coffee = $4.5`, then `3 coffees`) the currency it
 * was defined in, which `createUserUnit` records on the unit definition. Null for
 * anything that is not an amount of money. A value is classified by what it is,
 * not by its name, or `3 coffees` and `$10` are two unrelated groups (UNIT-06).
 */
export function moneyCurrency(unit) {
  if (!unit || unit.isUnit !== true || !isSingleUnit(unit)) return null;
  const [entry] = unit.units;
  if (entry.prefix && entry.prefix.name) return null;
  if (isCurrencyCode(entry.unit.name)) return entry.unit.name;
  return typeof entry.unit.currency === 'string' ? entry.unit.currency : null;
}

/**
 * A compound result that cancels down to one plain unit (`(USD year) / day` →
 * `USD`, `(GB s) / MB` → `s`, `(km year) / day` → `km`) is stored as that unit,
 * not as the raw compound. The raw form is only simplified when it is drawn, so
 * rounding, `prev`, `sum` and the total bar used to work on the raw number (24 for
 * `$24 a day for a year`) instead of the value that was shown (US$ 8,766;
 * REVIEW.md MIX-01). The currency the user wrote is kept, and a computed duration
 * stays marked as a timespan so it is still drawn as one. Anything that does not
 * reduce to a single unit (a rate like `USD/hour`, a power like `m^3`) is
 * returned as it was.
 * @param {*} value
 * @returns {*}
 */
export function normalizeUnit(value) {
  if (!value || value.isUnit !== true || isSingleUnit(value)) return value;
  let simple;
  try {
    simple = simplifyLocal(value);
  } catch {
    return value;
  }
  if (!simple || simple.isUnit !== true || !isSingleUnit(simple)) return value;

  const [entry] = simple.units;
  const name = (entry.prefix && entry.prefix.name ? entry.prefix.name : '') + entry.unit.name;
  if (isCurrencyCode(entry.unit.name)) {
    // `simplify()` folds a currency into mathjs's base currency; give it back in
    // the currency that was written. Two currencies (or none) cannot be placed.
    const written = leadingCurrency(value);
    if (!written) return value;
    try {
      return simple.to(written);
    } catch {
      return value;
    }
  }
  if (entry.unit.base && entry.unit.base.key === 'TIME') {
    const duration = simple.clone();
    duration.timespan = true;
    return duration;
  }
  return name ? simple : value;
}
