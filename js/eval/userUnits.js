import { registeredName, unitAliases } from '../core/userUnits.js';
import { moneyCurrency } from '../core/unitForm.js';

// Abbreviations only the date and time-span grammar knows (`3 mo`, `1 wk`, `2 yr`); the
// phrases would capture them before a unit of the same name could be read.
const GRAMMAR_ABBREVIATIONS = new Set(['mo', 'mos', 'w', 'wk', 'wks', 'yr', 'yrs']);

// A name that must not already be taken: a mathjs symbol/function/constant or an
// existing unit (built-in or another definition's alias).
function nameTaken(math, name) {
  if (math[name] !== undefined || GRAMMAR_ABBREVIATIONS.has(name)) return true;
  return Boolean(math.Unit && math.Unit.isValuelessUnit && math.Unit.isValuelessUnit(name));
}

// Register a user-defined unit. `value` is a finite number (dimensionless) or a
// Unit; it is passed to mathjs as the definition. Throws when the name is taken
// or the definition cannot be created.
function createUserUnit(math, name, value, { valueIsUnit = false } = {}) {
  const registered = registeredName(name);
  if (nameTaken(math, registered)) throw new Error(`"${name}" is already a unit`);
  // A plural that is already something else (`ds` is deciseconds) is dropped, so the
  // singular can still be defined and the built-in keeps its spelling.
  const aliases = unitAliases(name)
    .map(registeredName)
    .filter((alias) => !nameTaken(math, alias));
  math.createUnit(registered, { definition: valueIsUnit ? value : String(value), aliases });
  // A unit defined from money is money. Note which currency on the unit's own
  // definition (so it goes when the unit does), for the aggregates to read.
  const currency = valueIsUnit ? moneyCurrency(value) : null;
  if (currency) {
    for (const name of [registered, ...aliases]) {
      if (math.Unit.UNITS[name]) math.Unit.UNITS[name].currency = currency;
    }
  }
  return { name: registered, aliases, readable: name };
}

// Remove a unit and every alias it was registered with. mathjs's deleteUnit does
// not remove aliases, and it tolerates deleting a unit another definition used.
function removeUserUnit(math, unit) {
  if (!unit || !math.Unit || typeof math.Unit.deleteUnit !== 'function') return;
  for (const alias of unit.aliases || []) {
    try {
      math.Unit.deleteUnit(alias);
    } catch {
      // already gone
    }
  }
  try {
    math.Unit.deleteUnit(unit.name);
  } catch {
    // already gone
  }
}

export { createUserUnit, removeUserUnit };
