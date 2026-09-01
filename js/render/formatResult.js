const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 10 });

function formatResult(value) {
  if (typeof value === 'number') return formatNumber(value);
  if (value && value.isUnit === true) return formatUnit(value);
  return String(value);
}

function formatNumber(n) {
  if (!isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e16 || abs < 1e-7)) {
    return n.toExponential(10).replace(/\.?0+e/, 'e');
  }
  return numberFormatter.format(n);
}

function formatUnit(unit) {
  let value;
  try {
    value = unit.toNumber();
  } catch {
    value = unit.value;
  }
  const formatted = typeof value === 'number' ? formatNumber(value) : String(value);
  return `${formatted} ${unit.formatUnits()}`;
}

export default formatResult;
