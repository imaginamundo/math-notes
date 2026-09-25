import { registeredName, unitAliases } from '../core/userUnits.js';

// A name that must not already be taken: a mathjs symbol/function/constant or an
// existing unit (built-in or another definition's alias).
function nameTaken(math, name) {
  if (math[name] !== undefined) return true;
  return Boolean(math.Unit && math.Unit.isValuelessUnit && math.Unit.isValuelessUnit(name));
}

// Register a user-defined unit. `value` is a finite number (dimensionless) or a
// Unit; it is passed to mathjs as the definition. Throws when the name is taken
// or the definition cannot be created.
function createUserUnit(math, name, value, { valueIsUnit = false } = {}) {
  const registered = registeredName(name);
  const aliases = unitAliases(name).map(registeredName);
  if (nameTaken(math, registered) || aliases.some((alias) => nameTaken(math, alias))) {
    throw new Error(`"${name}" is already a unit`);
  }
  math.createUnit(registered, { definition: valueIsUnit ? value : String(value), aliases });
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
