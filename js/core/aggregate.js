const AGGREGATE_KEYWORDS = {
  sum: 'sum',
  total: 'sum',
  average: 'average',
  avg: 'average',
};

// Scan a range of results once into the plain-number sum and the per-unit
// groups, so totals and aggregates share the exact same rules.
function scan(results) {
  let numericSum = null;
  let numericCount = 0;
  const unitGroups = new Map();

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

    const key = value.formatUnits ? String(value.formatUnits()) : String(value);
    let group = unitGroups.get(key);
    if (!group) {
      group = { sum: 0, count: 0, sample: value, sampleAmount: amount };
      unitGroups.set(key, group);
    }
    group.sum += amount;
    group.count++;
    // Keep a non-zero sample so the summed unit can be rescaled safely.
    if (group.sampleAmount === 0 && amount !== 0) {
      group.sample = value;
      group.sampleAmount = amount;
    }
  }

  return { numericSum, numericCount, unitGroups };
}

// Apply the shared total/aggregate rules to a scan. `empty` is what an empty
// range yields (0 for an aggregate row, null for the running total).
function combine(summary, mode, empty) {
  const { numericSum, numericCount, unitGroups } = summary;

  // A single unit wins: plain numbers are folded into it as the same unit.
  // Several units are ignored, leaving only the plain numbers.
  if (unitGroups.size === 1) {
    const group = unitGroups.values().next().value;
    let amount = group.sum + (numericSum ?? 0);
    if (mode === 'average') {
      const count = group.count + numericCount;
      amount = count ? amount / count : 0;
    }
    return scaleUnit(group, amount);
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

// Rebuild a Unit of the same kind holding `amount`.
function scaleUnit(group, amount) {
  const { sample, sampleAmount } = group;
  if (!sample || typeof sample.multiply !== 'function') return null;
  try {
    if (!Number.isFinite(sampleAmount) || sampleAmount === 0) {
      return amount === 0 ? sample.multiply(0) : null;
    }
    return sample.multiply(amount / sampleAmount);
  } catch {
    return null;
  }
}

export { AGGREGATE_KEYWORDS, aggregateAbove, computeTotal };
