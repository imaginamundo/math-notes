import { create, all } from '../lib/math.bundle.min.js';
import parseLine from './parseLine.js';
import initCurrency, { registerRates } from '../eval/currency.js';
import initAliases from '../eval/aliases.js';
import initCssUnits from '../eval/cssUnits.js';
import initUnits from '../eval/units.js';
import initDatetime from '../eval/datetime.js';
import preprocess from './preprocess.js';
import { AGGREGATE_KEYWORDS, aggregateAbove, computeTotal } from './aggregate.js';

const math = create(all);
initAliases(math);
initCssUnits(math);
initUnits(math);
initDatetime(math);

initCurrency(math);

/**
 * @typedef {Object} LineResult
 * @property {('value'|'assignment'|'error')} type
 * @property {*} value  Display value; for the worker path this is a pre-formatted string.
 * @property {*} [assigned]  The value stored for an assignment (functions survive here).
 * @property {boolean} [aggregate]  True for aggregate (`sum`/`average`) rows.
 */

/**
 * @typedef {Object} SheetResult
 * @property {LineResult[]} results
 * @property {number|null} total
 * @property {number} startLine  First line that changed (-1 when input is unchanged).
 */

// Guard against expressions that would materialise unbounded arrays. A range
// like `1:1000000000` or a function over one (e.g. `sum(1:1e9)`) allocates the
// whole list up front and would lock the worker up, so reject anything a
// literal array or a (statically resolvable) range would expand beyond this.
const MAX_LIST_LENGTH = 100;

function assertBoundedExpression(expression, scope) {
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
        const count = Math.floor(Math.abs((end - start) / step)) + 1;
        if (count > MAX_LIST_LENGTH) {
          throw new Error(`Ranges are limited to ${MAX_LIST_LENGTH} items`);
        }
      }
    }
  });
}

function evaluateLine(line, scope) {
  const parsed = typeof line === 'string' ? parseLine(line) : line;
  const { code, label, rhs, isAssignment } = parsed;
  let type = isAssignment ? 'assignment' : 'value';
  let value;
  let result;

  try {
    const expression = preprocess(code);
    assertBoundedExpression(expression, scope);
    result = math.evaluate(expression, scope);
    value = rhs && math.evaluate(preprocess(rhs), scope);
  } catch (error) {
    result = error;
    value = undefined;
    type = 'error';
  }

  if (typeof result === 'function') result = undefined;

  const variable = isAssignment && value !== undefined ? { label, value } : null;

  return { type, result: result instanceof Error ? result.message : result, variable };
}

// Matches a standalone aggregate keyword, i.e. not a mathjs function call
// like `sum([1, 2, 3])`.
const AGGREGATE_WORD = /\b(?:sum|total|average|avg)\b(?!\s*\()/;
const AGGREGATE_SUM_WORD = /\b(?:sum|total)\b(?!\s*\()/g;
const AGGREGATE_AVG_WORD = /\b(?:average|avg)\b(?!\s*\()/g;

// Replace aggregate keywords in an expression with the block's values so they
// work inside expressions too, e.g. `a = sum` or `sum * 2`.
function substituteAggregates(parsed, sum, average) {
  const replace = (expression) =>
    expression
      .replace(AGGREGATE_SUM_WORD, String(sum))
      .replace(AGGREGATE_AVG_WORD, String(average));

  if (parsed.isAssignment) {
    const rhs = replace(parsed.rhs);
    return { ...parsed, code: `${parsed.label} = ${rhs}`, rhs };
  }
  return {
    ...parsed,
    code: replace(parsed.code),
    rhs: parsed.rhs ? replace(parsed.rhs) : parsed.rhs,
  };
}

const cache = {
  lines: [],
  results: [],
};

// Returns the index of the first line that differs, or -1 when identical.
function findFirstDifference(previous, next) {
  const length = Math.max(previous.length, next.length);
  for (let i = 0; i < length; i++) {
    if (previous[i] !== next[i]) return i;
  }
  return -1;
}

/**
 * Evaluate a sheet line by line.
 * @param {string[]} lines
 * @returns {SheetResult}
 */
function evaluateLines(lines) {
  const startLine = findFirstDifference(cache.lines, lines);
  if (startLine === -1) {
    return { results: cache.results, total: computeTotal(cache.results), startLine };
  }

  // Reuse the results of unchanged lines and rebuild the evaluation context up
  // to the first changed line from the cached values (no mathjs evaluation).
  const results = cache.results.slice(0, startLine);
  const variables = {};
  let previousResult;
  let lastBlankIndex = -1;

  for (let i = 0; i < startLine; i++) {
    const line = lines[i];
    if (line.trim() === '') lastBlankIndex = i;
    const parsed = parseLine(line);
    if (parsed.isAssignment && !AGGREGATE_KEYWORDS[parsed.label.toLowerCase()]) {
      const stored = results[i];
      const assigned = stored
        ? stored.assigned !== undefined
          ? stored.assigned
          : stored.value
        : undefined;
      if (assigned !== undefined) variables[parsed.label] = assigned;
    }
    const result = results[i];
    if (
      result &&
      result.type !== 'error' &&
      result.value !== undefined &&
      typeof result.value !== 'function'
    ) {
      previousResult = result.value;
    }
  }

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') lastBlankIndex = i;

    const parsed = parseLine(line);

    if (parsed.isAssignment && AGGREGATE_KEYWORDS[parsed.label.toLowerCase()]) {
      results[i] = { type: 'error', value: `"${parsed.label}" is a reserved word` };
      continue;
    }

    const keyword = AGGREGATE_KEYWORDS[parsed.code.trim().toLowerCase()];

    if (keyword) {
      const value = aggregateAbove(results, lastBlankIndex + 1, i, keyword);
      results[i] = { type: 'value', value, aggregate: true };
      if (value !== undefined) previousResult = value;
      continue;
    }

    const scope = { ...variables };
    if (previousResult !== undefined) scope.prev = previousResult;

    let parsedLine = parsed;
    if (AGGREGATE_WORD.test(parsed.code)) {
      const blockSum = aggregateAbove(results, lastBlankIndex + 1, i, 'sum');
      const blockAvg = aggregateAbove(results, lastBlankIndex + 1, i, 'average');
      parsedLine = substituteAggregates(parsed, blockSum, blockAvg);
    }

    const { type, result, variable } = evaluateLine(parsedLine, scope);
    if (variable) variables[variable.label] = variable.value;
    results[i] = { type, value: result, assigned: variable ? variable.value : undefined };
    if (type !== 'error' && result !== undefined && typeof result !== 'function') {
      previousResult = result;
    }
  }

  cache.lines = lines;
  cache.results = results;

  return { results, total: computeTotal(results), startLine };
}

/**
 * Register currency rates on this module's math instance (used by the worker).
 * @param {{ base: string, rates: Record<string, number> }} data
 */
function registerCurrencyRates(data) {
  registerRates(math, data);
}

export { evaluateLines, evaluateLine, registerCurrencyRates };
