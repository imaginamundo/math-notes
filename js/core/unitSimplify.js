// mathjs's `simplify()` folds a compound unit (`(km year) / day`, `m * cm * m`,
// `N * m`) into the unit its current *unit system* prefers for the resulting
// dimension. The default system, `auto`, remembers the last unit of each dimension
// mathjs parsed anywhere, so the same line read `gallon` or `BTU` depending on what
// else had been typed (REVIEW.md UNIT-02). The engine therefore runs on a fixed
// system, and a unit is simplified through `simplifyLocal`, which prefers the units
// the value itself was written in over SI: `24 km a day for a year` stays in km,
// and `5 N * 2 m` is J, whatever else is in the sheet.
const LOCAL = 'line';

/**
 * Simplify a mathjs Unit using SI plus the units it is made of, and nothing else.
 * @param {object} unit A mathjs Unit.
 * @returns {object} The simplified Unit (or `unit` itself if it cannot be simplified).
 */
export function simplifyLocal(unit) {
  if (!unit || unit.isUnit !== true || typeof unit.simplify !== 'function') return unit;
  const Unit = unit.constructor;
  const systems = Unit.UNIT_SYSTEMS;
  if (!systems || !systems.si || typeof Unit.setUnitSystem !== 'function') return unit.simplify();

  // Start from SI every time, so nothing from an earlier call is left behind.
  const local = (systems[LOCAL] ??= {});
  for (const key of Object.keys(local)) delete local[key];
  Object.assign(local, systems.si);

  // Then prefer what the value was written in: for each dimension, the first unit
  // of that dimension among its factors, with the prefix it was written with.
  const seen = new Set();
  for (const factor of unit.units) {
    const key = factor.unit.base && factor.unit.base.key;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    local[key] = { unit: factor.unit, prefix: factor.prefix };
  }

  const previous = Unit.getUnitSystem();
  Unit.setUnitSystem(LOCAL);
  try {
    return unit.simplify();
  } finally {
    Unit.setUnitSystem(previous);
  }
}
