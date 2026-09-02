const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 10 });
const LIST_SHOW = 12;

function formatResult(value) {
  if (typeof value === 'number') return formatNumber(value);
  if (value && value.isUnit === true) return formatUnit(value);
  if (Array.isArray(value) || (value && value.isMatrix)) {
    const items = value.isMatrix && value.toArray ? value.toArray() : value;
    return formatList(items);
  }
  return String(value);
}

// Keep sequences readable: show the full list when short, otherwise the first
// items and the last with an ellipsis in the middle.
function formatList(items) {
  if (!items.length) return '[]';
  if (items.length <= LIST_SHOW) {
    return `[${items.map((n) => formatItem(n)).join(', ')}]`;
  }
  const head = items
    .slice(0, LIST_SHOW - 1)
    .map((n) => formatItem(n))
    .join(', ');
  return `[${head}, …, ${formatItem(items[items.length - 1])}]`;
}

function formatItem(value) {
  return typeof value === 'number' ? formatNumber(value) : String(value);
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
