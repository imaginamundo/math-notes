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
 * @property {{ name: string, arity: number|null }} [fn]  Set when the line defines a
 *   function. Clone-safe on purpose: the function itself never leaves the worker.
 */

/**
 * @typedef {Object} SheetResult
 * @property {LineResult[]} results
 * @property {number|null} total
 * @property {number} startLine  First line that changed (-1 when input is unchanged).
 */

function evaluateLine(line, scope) {
  const parsed = typeof line === 'string' ? parseLine(line) : line;
  const { code, label, rhs, isAssignment } = parsed;
  let type = isAssignment ? 'assignment' : 'value';
  let value;
  let result;

  try {
    result = math.evaluate(preprocess(code), scope);
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
    // Tag function definitions so the main thread can list them in the plot
    // picker. The tag is clone-safe; the function itself stays in the worker.
    if (variable && typeof variable.value === 'function') {
      results[i].fn = { name: variable.label, arity: functionArity(variable.value) };
    }
    if (type !== 'error' && result !== undefined && typeof result !== 'function') {
      previousResult = result;
    }
  }

  cache.lines = lines;
  cache.results = results;

  return { results, total: computeTotal(results), startLine };
}

// mathjs wraps user functions, so `fn.length` is always 2. The declared
// parameters survive on `fn.syntax` ("f(x)"), which is what we count.
function functionArity(fn) {
  const syntax = typeof fn.syntax === 'string' ? fn.syntax : '';
  const open = syntax.indexOf('(');
  const close = syntax.lastIndexOf(')');
  if (open === -1 || close <= open) return null;
  const inner = syntax.slice(open + 1, close).trim();
  return inner ? inner.split(',').length : 0;
}

// Sampling is capped here, in the engine, regardless of what the UI asks for.
const MAX_SAMPLES = 256;
const DEFAULT_SAMPLES = 64;

// Deliberately low resolution, per the issue — and cheap in the worker.
function clampSamples(samples) {
  const requested = Math.floor(Number(samples));
  if (!Number.isFinite(requested)) return DEFAULT_SAMPLES;
  return Math.max(2, Math.min(MAX_SAMPLES, requested));
}

function toPlainNumber(value) {
  if (typeof value === 'number') return value;
  // A BigNumber is plottable; a Unit, matrix or complex number is not.
  if (value && value.isBigNumber === true && typeof value.toNumber === 'function') {
    try {
      return value.toNumber();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Sample a single-argument function defined in the sheet.
 *
 * This has to run WHERE THE FUNCTION STILL EXISTS. `evaluateLine` drops
 * function results and structured clone cannot carry them, so the main thread
 * can never sample a user function itself — it asks the worker instead.
 *
 * Re-evaluating the sheet is close to free: an unchanged sheet is served
 * straight from the module cache, whose `assigned` slots still hold the live
 * function objects.
 *
 * @param {string[]} lines
 * @param {string} name
 * @param {number} from
 * @param {number} to
 * @param {number} [samples]
 * @returns {{ points: Array<[number, number]>, skipped: number, reason: string|null }}
 */
function sampleFunction(lines, name, from, to, samples) {
  const empty = (reason) => ({ points: [], skipped: 0, reason });

  const { results } = evaluateLines(lines);
  const entry = results.find((result) => result && result.fn && result.fn.name === name);
  if (!entry || typeof entry.assigned !== 'function') {
    return empty(`"${name}" is not a function in this sheet`);
  }
  if (entry.fn.arity !== 1) {
    const arity = entry.fn.arity === null ? 'an unknown number of' : entry.fn.arity;
    return empty(
      `"${name}" takes ${arity} arguments; only single-argument functions can be plotted`
    );
  }
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) {
    return empty('The domain needs two different finite numbers');
  }

  const fn = entry.assigned;
  const count = clampSamples(samples);
  const points = [];
  let skipped = 0;
  let nonNumeric = 0;

  for (let i = 0; i < count; i++) {
    const x = from + ((to - from) * i) / (count - 1);
    let raw;
    // A user function may throw on any single input; that must never take the
    // worker down, so every sample is guarded individually.
    try {
      raw = fn(x);
    } catch {
      skipped++;
      continue;
    }
    const y = toPlainNumber(raw);
    if (y === null || !Number.isFinite(y)) {
      skipped++;
      if (y === null && raw !== undefined) nonNumeric++;
      continue;
    }
    points.push([x, y]);
  }

  if (!points.length) {
    return {
      points,
      skipped,
      reason: nonNumeric
        ? `"${name}" doesn't return a plain number, so it can't be plotted`
        : `"${name}" produced no finite values on that domain`,
    };
  }
  return { points, skipped, reason: null };
}

/**
 * Register currency rates on this module's math instance (used by the worker).
 * @param {{ base: string, rates: Record<string, number> }} data
 */
function registerCurrencyRates(data) {
  registerRates(math, data);
}

export { evaluateLines, evaluateLine, sampleFunction, registerCurrencyRates };
export { MAX_SAMPLES, DEFAULT_SAMPLES };
