// Constructors that take a size (`ones`, `identity`, `random`, `resize`, …) will
// allocate whatever they are asked for, and a worker that runs out of memory
// takes the whole tab down with it. The static check in boundedExpression.js can
// only read sizes that are literals in the text; `ones(n)`, `ones([40000, 40000])`
// and BigNumber sizes get past it. So the limit is also enforced where the
// allocation would happen: each of these functions is wrapped to count what it is
// about to build, from its already-evaluated arguments, and to refuse past the cap
// (REVIEW.md PRE-01).

export const MAX_ITEMS = 100;
// A powerset doubles with every element, so its cap is far lower.
const MAX_POWERSET_ELEMENTS = 16;

const isNumberLike = (value) =>
  typeof value === 'number' || (value && (value.isBigNumber === true || value.isFraction === true));
const isMatrix = (value) => Boolean(value) && value.isMatrix === true;

function toNumber(value) {
  if (typeof value === 'number') return value;
  if (isNumberLike(value)) return Number(value.toString());
  return NaN;
}

// Plain arrays, whatever their nesting, as a flat list of leaves.
function leaves(value, out = []) {
  const items = isMatrix(value) ? value.toArray() : value;
  if (Array.isArray(items)) for (const item of items) leaves(item, out);
  else out.push(items);
  return out;
}

// How many items a list or matrix argument holds (a scalar counts as one).
function count(value) {
  return isMatrix(value) || Array.isArray(value) ? leaves(value).length : 1;
}

// The cells a size argument asks for. A size is a number, or a list of numbers.
// Anything that is not a finite non-negative number is treated as unbounded, so a
// malformed size is refused here instead of being passed on to allocate.
function cellsFor(sizes) {
  let total = 1;
  for (const size of sizes) {
    const n = toNumber(size);
    if (!Number.isFinite(n) || n < 0) return Infinity;
    total *= Math.floor(n);
    if (total > Number.MAX_SAFE_INTEGER) return Infinity;
  }
  return total;
}

// `ones(3, 4)`, `ones([3, 4])`, `ones(3, 4, 'dense')`: every number-like argument
// is a dimension, or the one list argument is the whole size.
function dimensions(args) {
  const [first] = args;
  if (Array.isArray(first) || isMatrix(first)) return leaves(first);
  return args.filter(isNumberLike);
}

function refuse() {
  throw new Error(`Lists are limited to ${MAX_ITEMS} items`);
}

function guardCells(cells) {
  if (cells > MAX_ITEMS) refuse();
}

// The number of elements `range` would produce, from its evaluated arguments or
// from the `'start:step:end'` text form.
function rangeCount(args) {
  let [start, end, step] = args;
  if (typeof start === 'string') {
    const parts = start.split(':').map((part) => Number(part));
    if (parts.length === 2) [start, end, step] = [parts[0], parts[1], 1];
    else if (parts.length === 3) [start, step, end] = parts;
    else return 0;
  } else if (args.length === 1) {
    [start, end, step] = [0, start, 1];
  }
  const [a, b, c] = [start, end, step ?? 1].map(toNumber);
  if (![a, b, c].every(Number.isFinite) || c === 0) return 0;
  return Math.max(0, Math.floor((b - a) / c) + 1);
}

// How many cells each constructor would build, from its evaluated arguments.
const CELLS = {
  ones: (args) => cellsFor(dimensions(args)),
  zeros: (args) => cellsFor(dimensions(args)),
  // `identity(n)` is n × n, `identity(r, c)` and `identity([r, c])` are r × c.
  identity: (args) => {
    const dims = dimensions(args);
    return cellsFor(dims.length === 1 ? [dims[0], dims[0]] : dims);
  },
  random: ([first]) => (Array.isArray(first) || isMatrix(first) ? cellsFor(leaves(first)) : 1),
  randomInt: ([first]) => (Array.isArray(first) || isMatrix(first) ? cellsFor(leaves(first)) : 1),
  resize: ([, size]) => cellsFor(isNumberLike(size) ? [size] : leaves(size)),
  reshape: ([, size]) => cellsFor(isNumberLike(size) ? [size] : leaves(size)),
  matrixFromFunction: ([size]) => cellsFor(isNumberLike(size) ? [size] : leaves(size)),
  kron: ([a, b]) => count(a) * count(b),
  // A vector of n on a diagonal offset by k is an (n + |k|) × (n + |k|) matrix.
  diag: ([x, k]) => {
    const n = isMatrix(x) || Array.isArray(x) ? leaves(x).length : 1;
    const side = n + Math.abs(toNumber(k ?? 0) || 0);
    return side * side;
  },
  concat: (args) => args.reduce((sum, arg) => sum + (isNumberLike(arg) ? 0 : count(arg)), 0),
  sparse: ([data]) => count(data),
  setCartesian: ([a, b]) => count(a) * count(b),
  range: rangeCount,
};

// The cells a list or matrix would have after `index` is assigned into it: each
// dimension grows to hold the largest index written. (`Index#max` is 0-based.)
function grownCells(value, index) {
  if (!isMatrix(value) && !Array.isArray(value)) return 0;
  const current = isMatrix(value) ? value.size() : arraySize(value);
  const written = index.max().map(toNumber);
  const dims = Math.max(current.length, written.length);
  const sizes = [];
  for (let d = 0; d < dims; d++) sizes.push(Math.max(current[d] ?? 0, (written[d] ?? -1) + 1));
  return cellsFor(sizes);
}

function arraySize(array) {
  const sizes = [];
  for (let level = array; Array.isArray(level); level = level[0]) sizes.push(level.length);
  return sizes;
}

// How each guarded function is checked, as `(args) => void` that throws to refuse.
const GUARDS = {
  ...Object.fromEntries(
    Object.entries(CELLS).map(([name, cells]) => [name, (args) => guardCells(cells(args))])
  ),
  // Assigning past the end (`n[1000000000] = 1`) grows the list to fit, which is
  // the same allocation by another route. `subset` is what an indexed assignment
  // calls; its two-argument form only reads, so only the replacing form is checked.
  subset: ([value, index, ...rest]) => {
    if (rest.length > 0 && index && index.isIndex === true) guardCells(grownCells(value, index));
  },
  setPowerset: ([set]) => {
    if (count(set) > MAX_POWERSET_ELEMENTS) {
      throw new Error(`Powersets are limited to ${MAX_POWERSET_ELEMENTS} items`);
    }
  },
};

/**
 * Wrap the size-taking functions of a mathjs instance so they refuse to build
 * more than MAX_ITEMS items. Call after the engine has finished configuring it.
 *
 * `range`, `subset` and `concat` have a separate version for the expression
 * parser (inclusive ends, 1-based indexes and dimensions), so each version is
 * wrapped around its own original: replacing both with one wrapper would change
 * what `1:100` means.
 * @param {object} math
 */
export function limitSizes(math) {
  const forParser = math.expression.mathWithTransform;
  for (const [name, guard] of Object.entries(GUARDS)) {
    const plain = math[name];
    if (typeof plain !== 'function') continue;
    const transformed = forParser[name];
    const wrap = (fn) =>
      function bounded(...args) {
        guard(args);
        return fn(...args);
      };
    math[name] = wrap(plain);
    forParser[name] = transformed === plain ? math[name] : wrap(transformed);
  }
}
