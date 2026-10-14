// A sheet is untrusted text (it can arrive in a share link), and mathjs lets an
// expression call functions that rewrite the engine itself: `config` changes the
// numeric type and tolerances, `createUnit` redefines `USD` or `km`. The engine
// is shared by every tab and outlives the line that did it, so one hostile line
// would keep corrupting results after it was deleted (REVIEW.md PRE-02).
//
// `lockDown` replaces those functions, as seen from a sheet, with stubs that
// throw, and returns a view of the engine's maths that still has the real ones,
// for the engine's own use (registering rates, units and measurement systems,
// and parsing a line to check its size).

// Functions a sheet must not call. Two groups: the ones that change engine state,
// and the ones that evaluate text or build nodes, which would reach the first
// group through the unrestricted maths namespace.
const BLOCKED = [
  // changes engine state
  'config',
  'createUnit',
  'import',
  // evaluate text, or build and run expression trees
  'evaluate',
  'parse',
  'compile',
  'parser',
  'help',
  'simplify',
  'simplifyCore',
  'simplifyConstant',
  'rationalize',
  'derivative',
  'resolve',
  'symbolicEqual',
  'leafCount',
  'AccessorNode',
  'ArrayNode',
  'AssignmentNode',
  'BlockNode',
  'ConditionalNode',
  'ConstantNode',
  'FunctionAssignmentNode',
  'FunctionNode',
  'IndexNode',
  'ObjectNode',
  'OperatorNode',
  'ParenthesisNode',
  'RangeNode',
  'RelationalNode',
  'SymbolNode',
  'Node',
];

/**
 * @param {object} math A mathjs instance, after the engine has finished configuring it.
 * @returns {object} A view of `math` that keeps the real blocked functions.
 */
function lockDown(math) {
  const real = {};
  const stubs = {};
  for (const name of BLOCKED) {
    if (typeof math[name] !== 'function') continue;
    real[name] = math[name];
    stubs[name] = function blocked() {
      throw new Error(`"${name}" is not available in a sheet`);
    };
  }
  math.import(stubs, { override: true });

  const trusted = Object.create(math);
  for (const [name, fn] of Object.entries(real)) {
    Object.defineProperty(trusted, name, { value: fn });
  }
  return trusted;
}

export { lockDown, BLOCKED };
