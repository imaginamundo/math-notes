// Guard against expressions that would materialise unbounded arrays. A range
// like `1:1000000000` or a function over one (e.g. `sum(1:1e9)`) allocates the
// whole list up front and would lock the worker up, so reject anything a
// literal array or a (statically resolvable) range would expand beyond this.
const MAX_LIST_LENGTH = 100;

function assertBoundedExpression(math, expression, scope) {
  // Only a list literal, a range or a size-taking constructor can materialise
  // unboundedly; skip the extra parse for every other expression.
  if (!/\[|:/.test(expression) && !/\b(?:range|ones|zeros)\s*\(/i.test(expression)) return;
  let tree;
  try {
    tree = math.parse(expression);
  } catch {
    return; // math.evaluate reports the parse error itself
  }
  const resolve = (node, fallback) => {
    if (node === null || node === undefined) return fallback;
    try {
      const value = math.evaluate(node.toString(), scope);
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  };
  tree.traverse((node) => {
    if (node.isArrayNode && node.items.length > MAX_LIST_LENGTH) {
      throw new Error(`Lists are limited to ${MAX_LIST_LENGTH} items`);
    }
    if (node.isRangeNode) {
      const start = resolve(node.start, 1);
      const end = resolve(node.end, null);
      const step = resolve(node.step, 1);
      if (end !== null && step !== null) {
        // Sign-aware count: a range that descends (or steps the wrong way)
        // materialises nothing, while a genuinely long ascending one does.
        const count = Math.max(0, Math.floor((end - start) / step) + 1);
        if (count > MAX_LIST_LENGTH) {
          throw new Error(`Ranges are limited to ${MAX_LIST_LENGTH} items`);
        }
      }
    }
    // `range(1, 1e9)` and `ones(1e5, 1e5)` bypass the node checks above because
    // the size is inside a function call, not a literal.
    if (node.isFunctionNode) {
      const name = node.fn && node.fn.name;
      if (name === 'range') {
        const args = node.args.map((arg) => resolve(arg, null));
        const start = args.length >= 2 ? args[0] : 1;
        const end = args.length >= 2 ? args[1] : args[0];
        const step = args.length >= 3 ? args[2] : 1;
        if (start !== null && end !== null && step !== null) {
          const count = Math.max(0, Math.floor((end - start) / step) + 1);
          if (count > MAX_LIST_LENGTH) {
            throw new Error(`Ranges are limited to ${MAX_LIST_LENGTH} items`);
          }
        }
      } else if (name === 'ones' || name === 'zeros') {
        const sizes = node.args.map((arg) => resolve(arg, null));
        if (sizes.length && sizes.every((size) => size !== null)) {
          const count = sizes.reduce((total, size) => total * Math.max(0, Math.floor(size)), 1);
          if (count > MAX_LIST_LENGTH) {
            throw new Error(`Lists are limited to ${MAX_LIST_LENGTH} items`);
          }
        }
      }
    }
  });
}

export { assertBoundedExpression };
