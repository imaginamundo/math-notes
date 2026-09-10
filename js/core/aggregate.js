const AGGREGATE_KEYWORDS = {
  sum: 'sum',
  total: 'sum',
  average: 'average',
  avg: 'average',
};

const NUMERIC = (result) =>
  result.type === 'value' &&
  !result.aggregate &&
  Number(result.value) === result.value &&
  Number.isFinite(result.value);

function aggregateAbove(results, fromIndex, toIndex, mode) {
  const values = results
    .slice(fromIndex, toIndex)
    .filter(NUMERIC)
    .map(({ value }) => value);
  if (!values.length) return 0;
  const sum = values.reduce((acc, cur) => acc + cur);
  return mode === 'sum' ? sum : sum / values.length;
}

function computeTotal(results) {
  let numericSum = null;
  const unitGroups = new Map();

  for (const result of results) {
    if (result.type !== 'value' || result.aggregate) continue;
    const value = result.value;

    if (typeof value === 'number' && Number.isFinite(value)) {
      numericSum = (numericSum ?? 0) + value;
      continue;
    }

    if (value && value.isUnit === true) {
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
        group = { sum: 0, sample: value, sampleAmount: amount };
        unitGroups.set(key, group);
      }
      group.sum += amount;
      // Keep a non-zero sample so the summed unit can be rescaled safely.
      if (group.sampleAmount === 0 && amount !== 0) {
        group.sample = value;
        group.sampleAmount = amount;
      }
    }
  }

  if (unitGroups.size === 0) return numericSum;
  // A single unit totals in that unit, and plain numbers are folded in as the
  // same unit. Multiple units are ignored, leaving only the plain numbers.
  if (unitGroups.size === 1) {
    const group = unitGroups.values().next().value;
    return scaleUnit(group, group.sum + (numericSum ?? 0));
  }
  return numericSum;
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
