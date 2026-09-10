import { isCurrencyCode } from '../eval/symbols.js';

const AGGREGATE_KEYWORDS = {
  sum: 'sum',
  total: 'sum',
  average: 'average',
  avg: 'average',
};

// Affine units (offset scales) must never be merged with anything: adding
// absolute temperatures is meaningless. Each stays its own group.
const AFFINE_UNITS = new Set(['degc', 'celsius', 'degf', 'fahrenheit']);

function unitName(value) {
  return value.formatUnits ? String(value.formatUnits()) : String(value);
}

function unitKind(name) {
  if (isCurrencyCode(name)) return 'currency';
  if (AFFINE_UNITS.has(name.toLowerCase())) return 'affine';
  return 'dimension';
}

// How many `targetName` units one unit of `entry` is worth (e.g. cm -> m is
// 0.01). Uses a non-zero sample so the ratio stays finite.
function unitRatio(entry, targetName) {
  if (entry.unit === targetName) return 1;
  const amount = entry.sampleAmount;
  if (!amount) return 1;
  try {
    return entry.sample.to(targetName).toNumber() / amount;
  } catch {
    return 1;
  }
}

function buildUnit(entry, amount) {
  if (!entry || typeof entry.sample.multiply !== 'function') return null;
  const sampleAmount = entry.sampleAmount;
  try {
    if (!Number.isFinite(sampleAmount) || sampleAmount === 0) {
      return amount === 0 ? entry.sample.multiply(0) : null;
    }
    return entry.sample.multiply(amount / sampleAmount);
  } catch {
    return null;
  }
}

// Scan a range of results once into the plain-number sum and the unit groups,
// so totals and aggregates share the exact same rules.
function scan(results) {
  let numericSum = null;
  let numericCount = 0;
  const groups = [];

  for (const result of results) {
    if (result.type !== 'value' || result.aggregate) continue;
    const value = result.value;

    if (typeof value === 'number' && Number.isFinite(value)) {
      numericSum = (numericSum ?? 0) + value;
      numericCount++;
      continue;
    }
    if (!(value && value.isUnit === true)) continue;

    let amount;
    try {
      amount = value.toNumber();
    } catch {
      amount = value.value;
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount)) continue;

    const name = unitName(value);
    const kind = unitKind(name);
    const group = findGroup(groups, kind, name, value);
    addUnit(group, name, value, amount);
  }

  return { numericSum, numericCount, groups };
}

function findGroup(groups, kind, name, value) {
  const group =
    kind === 'dimension'
      ? groups.find((entry) => entry.kind === 'dimension' && entry.sample.equalBase(value))
      : groups.find((entry) => entry.kind === kind && entry.name === name);
  if (group) return group;
  const created = { kind, name, sample: value, units: new Map() };
  groups.push(created);
  return created;
}

function addUnit(group, name, value, amount) {
  let entry = group.units.get(name);
  if (!entry) {
    entry = { unit: name, sum: 0, count: 0, sample: value, sampleAmount: amount };
    group.units.set(name, entry);
  }
  entry.sum += amount;
  entry.count++;
  // Keep a non-zero sample so conversions and rescaling stay finite.
  if (entry.sampleAmount === 0 && amount !== 0) {
    entry.sample = value;
    entry.sampleAmount = amount;
  }
}

// The display unit for a group: for a dimension with several units, the
// largest present one; otherwise the only unit.
function targetEntry(group) {
  const entries = [...group.units.values()];
  let target = entries[0];
  if (group.kind === 'dimension' && entries.length > 1) {
    const reference = entries[0].unit;
    let best = -Infinity;
    for (const entry of entries) {
      const ratio = unitRatio(entry, reference);
      if (ratio > best) {
        best = ratio;
        target = entry;
      }
    }
  }
  return target;
}

// The group's summed amount, converted into its display unit.
function groupAmount(group) {
  const target = targetEntry(group);
  let amount = 0;
  for (const entry of group.units.values()) {
    amount += entry.sum * unitRatio(entry, target.unit);
  }
  return amount;
}

function groupCount(group) {
  let count = 0;
  for (const entry of group.units.values()) count += entry.count;
  return count;
}

// Apply the shared total/aggregate rules to a scan. `empty` is what an empty
// range yields (0 for an aggregate row, null for the running total).
function combine(summary, mode, empty) {
  const { numericSum, numericCount, groups } = summary;

  // Exactly one unit group: plain numbers fold into it. Several groups
  // (different dimensions, currencies or affine units) are ignored, leaving
  // only the plain numbers.
  if (groups.length === 1) {
    const group = groups[0];
    const combined = groupAmount(group) + (numericSum ?? 0);
    const count = groupCount(group) + numericCount;
    const amount = mode === 'average' ? (count ? combined / count : 0) : combined;
    const value = buildUnit(targetEntry(group), amount);
    if (value !== null) return value;
  }

  if (numericSum === null) return empty;
  return mode === 'average' ? numericSum / numericCount : numericSum;
}

function aggregateAbove(results, fromIndex, toIndex, mode) {
  return combine(scan(results.slice(fromIndex, toIndex)), mode, 0);
}

function computeTotal(results) {
  return combine(scan(results), 'sum', null);
}

export { AGGREGATE_KEYWORDS, aggregateAbove, computeTotal };
