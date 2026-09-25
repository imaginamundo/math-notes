import { isCurrencyCode } from './currencySymbols.js';
import { readableUnit } from './unitNames.js';
import { decodeUnitName } from './userUnits.js';

const LENGTH = 'LENGTH';

// Units only combine in a few shapes that mean something:
//   - a single unit (`kg`, `J`, `m^2` for area, `m^3` for volume),
//   - a ratio of two dimensions (`km/day`, `USD/hour`, `kg/m^2`),
//   - a named derived unit, which maths.js keeps as its own dimension
//     (`5 N * 2 m` simplifies to `J`).
// A product of two kinds (`kg L`, `BRL hour`, `GB m`), a squared non-length
// (`h^2`, `kg^2`), a fractional power (`m^0.5`) or a three-dimensional ratio has
// no meaning, so `unitMixError` returns a message for it and null otherwise.
export function unitMixError(value) {
  if (!value || value.isUnit !== true) return null;

  let simple = value;
  try {
    if (typeof value.simplify === 'function') simple = value.simplify();
  } catch {
    // Fall back to the raw unit.
  }

  const powers = new Map();
  for (const entry of simple.units) {
    const key = entry.unit.base && entry.unit.base.key;
    if (!key) return null;
    const current = powers.get(key) || { power: 0, label: labelOf(entry) };
    current.power += entry.power;
    powers.set(key, current);
  }

  const dimensions = [...powers.entries()].filter(([, entry]) => entry.power !== 0);
  if (!dimensions.length) return null;

  for (const [, entry] of dimensions) {
    if (!Number.isInteger(entry.power)) return broken(value);
  }
  if (dimensions.length > 2) return broken(value);

  if (dimensions.length === 1) {
    const [key, entry] = dimensions[0];
    if (entry.power === 1) return null;
    if (key === LENGTH && entry.power <= 3 && entry.power >= -3) return null;
    return broken(value);
  }

  const [, first] = dimensions[0];
  const [, second] = dimensions[1];
  if (Math.sign(first.power) === Math.sign(second.power)) return broken(value);
  return null;
}

function labelOf(entry) {
  const prefix = entry.prefix && entry.prefix.name ? entry.prefix.name : '';
  return decodeUnitName(prefix + entry.unit.name) || prefix + entry.unit.name;
}

// Build the message from the units the user wrote, so it names what clashed.
function broken(value) {
  const labels = [];
  let currency = null;
  for (const entry of value.units) {
    const label = labelOf(entry);
    if (isCurrencyCode(entry.unit.name)) {
      currency = currency || label;
    } else if (!labels.includes(label)) {
      labels.push(label);
    }
  }

  if (currency && labels.length) {
    const other = readableUnit(labels[0]);
    return `Cannot multiply a currency by "${other}" — use a rate like "${currency} per ${other}"`;
  }
  if (currency) return 'Cannot multiply currencies together';
  if (labels.length > 1) {
    return `Cannot combine "${labels[0]}" and "${labels[1]}" — that unit has no meaning`;
  }
  return `"${labels[0]}" cannot be used with that power`;
}
