const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 10 });
const LIST_SHOW = 12;
const MAX_DEPTH = 3;
const IDENTIFIER_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function formatResult(value) {
  return formatValue(value, 0);
}

function formatValue(value, depth) {
  if (typeof value === 'number') return formatNumber(value);
  if (value && value.isUnit === true) return formatUnit(value);
  if (Array.isArray(value) || (value && value.isMatrix)) {
    if (depth >= MAX_DEPTH) return '[…]';
    const items = value.isMatrix && value.toArray ? value.toArray() : value;
    return formatList(items, depth);
  }
  if (isPlainObject(value)) {
    return depth >= MAX_DEPTH ? '{…}' : formatObject(value, depth);
  }
  return String(value);
}

// mathjs object literals evaluate to plain objects; Complex/BigNumber/Fraction
// are also objects but keep their own `toString`, so only match the plain ones.
function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function formatObject(object, depth) {
  const keys = Object.keys(object);
  if (!keys.length) return '{}';
  const entry = (key) =>
    `${IDENTIFIER_KEY.test(key) ? key : JSON.stringify(key)}: ${formatValue(object[key], depth + 1)}`;
  if (keys.length <= LIST_SHOW) return `{ ${keys.map(entry).join(', ')} }`;
  const head = keys
    .slice(0, LIST_SHOW - 1)
    .map(entry)
    .join(', ');
  return `{ ${head}, …, ${entry(keys[keys.length - 1])} }`;
}

// Keep sequences readable: show the full list when short, otherwise the first
// items and the last with an ellipsis in the middle.
function formatList(items, depth) {
  if (!items.length) return '[]';
  const item = (value) => formatValue(value, depth + 1);
  if (items.length <= LIST_SHOW) return `[${items.map(item).join(', ')}]`;
  const head = items
    .slice(0, LIST_SHOW - 1)
    .map(item)
    .join(', ');
  return `[${head}, …, ${item(items[items.length - 1])}]`;
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
