import { create, all } from '../lib/math.bundle.min.js';
import parseLine from './parseLine.js';
import initCurrency, { registerRates } from '../eval/currency.js';
import initAliases from '../eval/aliases.js';
import initCssUnits from '../eval/cssUnits.js';
import initUnits from '../eval/units.js';
import initDatetime from '../eval/datetime.js';
import initRounding from '../eval/rounding.js';
import initMeasures, { applyMeasurementSystem } from '../eval/measures.js';
import initRates from '../eval/rates.js';
import { readMeasurementSystem } from './measurementSystem.js';
import preprocess from './preprocess.js';
import { AGGREGATE_KEYWORDS, aggregateAbove, computeTotal } from './aggregate.js';
import { firstDifference } from '../util/sequence.js';
import { mangleLines, unmangleName } from './multiWordVariables.js';

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

// Matches a standalone aggregate keyword, i.e. not a mathjs function call
// like `sum([1, 2, 3])`.
const AGGREGATE_WORD = /\b(?:sum|total|average|avg)\b(?!\s*\()/i;
const AGGREGATE_SUM_WORD = /\b(?:sum|total)\b(?!\s*\()/gi;
const AGGREGATE_AVG_WORD = /\b(?:average|avg)\b(?!\s*\()/gi;

// A group opens with a header line (`Name:` with no expression) and closes with
// a line whose code is exactly `end`. Groups are flat: an unterminated header is
// just a label, and an `end` with no open group is reported as an error.
function findGroups(lines) {
  const byEnd = new Map();
  const groupOfLine = new Map();
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    const parsed = parseLine(lines[i]);
    const isHeader = parsed.title !== '' && parsed.code.trim() === '';
    if (isHeader) {
      open = { start: i, end: -1 };
      continue;
    }
    if (open && parsed.code.trim() === 'end') {
      open.end = i;
      byEnd.set(i, open);
      for (let k = open.start; k <= i; k++) groupOfLine.set(k, open);
      open = null;
    }
  }
  return { byEnd, groupOfLine };
}

// A tag request line: bare `#food` sums, and `sum|total|average|avg [#food]`
// (optionally `... of #food`) picks the mode. Returns null when the code is an
// ordinary expression.
function tagAggregateMode(code) {
  const text = code.trim();
  if (text === '') return 'sum';
  const match = /^(sum|total|average|avg)\s*(of)?$/i.exec(text);
  if (!match) return null;
  return match[1].toLowerCase().startsWith('a') ? 'average' : 'sum';
}

// Combine every tagged value row above the request, using the same unit rules
// as the running total. A row tagged with several requested tags counts once.
// Returns null when no row carries any of the requested tags.
function tagAggregate(results, tags, toIndex, mode) {
  const tagged = results
    .slice(0, toIndex)
    .filter(
      (result) =>
        result &&
        result.type === 'value' &&
        !result.aggregate &&
        Array.isArray(result.tags) &&
        tags.some((tag) => result.tags.includes(tag))
    );
  if (!tagged.length) return null;
  return aggregateAbove(tagged, 0, tagged.length, mode);
}

function tagError(tags) {
  return `No values tagged ${tags.map((tag) => `#${tag}`).join(', ')}`;
}

// Rewrite a line whose tags take part in the calculation (`#food * 2`) so each
// `#tag` becomes a scope variable holding the tag's aggregate over the rows
// above. Returns the rewritten text, the values to inject, or an error when a
// tag has no tagged rows.
function substituteTags(parsed, results, index) {
  const text = parsed.rawCode + parsed.tail.slice(0, parsed.tail.length - parsed.comment.length);
  const values = {};
  let error = null;

  const substituted = text.replace(/#([A-Za-z0-9_-]+)/g, (match, tag) => {
    const name = `__tag_${tag.replace(/[^A-Za-z0-9_]/g, '_')}`;
    if (name in values) return name;
    if (error) return match;
    const value = tagAggregate(results, [tag], index, 'sum');
    if (value === null) {
      error = tagError([tag]);
      return match;
    }
    values[name] = value;
    return name;
  });

  return { text: substituted, values, error };
}

// Replace `line(n)` with an internal token bound to the value of line n, which
// must be a value row above the current line. Returns the rewritten parsed line
// and the scope values to inject, or an error message.
function resolveLineRefs(parsed, results, index) {
  const values = {};
  let error = null;

  const replace = (text) =>
    text.replace(/\bline\s*\(\s*(\d+)\s*\)/g, (match, digits) => {
      if (error) return match;
      const n = Number(digits);
      if (n < 1) {
        error = `Line ${n} does not exist`;
        return match;
      }
      if (n > index) {
        error = `Line ${n} is below this line`;
        return match;
      }
      const ref = results[n - 1];
      if (
        !ref ||
        ref.type !== 'value' ||
        ref.value === undefined ||
        typeof ref.value === 'function'
      ) {
        error = `Line ${n} has no value`;
        return match;
      }
      const token = `__line_${n}`;
      values[token] = ref.value;
      return token;
    });

  return {
    parsed: {
      ...parsed,
      code: replace(parsed.code),
      rhs: parsed.rhs ? replace(parsed.rhs) : parsed.rhs,
    },
    values,
    error,
  };
}

/**
 * Build an isolated evaluation engine: its own mathjs instance (aliases, css
 * and currency units configured), its own incremental result cache and its own
 * currency-rate revision. Nothing is constructed at import time.
 */
function createEngine() {
  const math = create(all);
  initAliases(math);
  initCssUnits(math);
  initUnits(math);
  initDatetime(math);
  initRounding(math);
  initMeasures(math, readMeasurementSystem());
  initRates(math);
  initCurrency(math);

  const cache = {
    lines: [],
    results: [],
    revision: -1,
  };

  // Bumped whenever evaluation semantics change without the lines changing
  // (currency rates registered), so the cache cannot serve stale results.
  let environmentRevision = 0;

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
          // Sign-aware count: a range that descends (or steps the wrong way)
          // materialises nothing, while a genuinely long ascending one does.
          const count = Math.max(0, Math.floor((end - start) / step) + 1);
          if (count > MAX_LIST_LENGTH) {
            throw new Error(`Ranges are limited to ${MAX_LIST_LENGTH} items`);
          }
        }
      }
    });
  }

  function evaluateLine(line, scope) {
    const parsed = typeof line === 'string' ? parseLine(line) : line;
    const { code, label, isAssignment } = parsed;
    let type = isAssignment ? 'assignment' : 'value';
    let value;
    let result;

    try {
      const expression = preprocess(code);
      assertBoundedExpression(expression, scope);
      result = math.evaluate(expression, scope);
      // The assignment statement already returns the rhs value; reuse it rather
      // than evaluating the rhs a second time, which could disagree for impure
      // expressions (e.g. `x = unix()`).
      value = isAssignment ? result : undefined;
    } catch (error) {
      result = friendlyError(error, code, scope);
      value = undefined;
      type = 'error';
    }

    if (typeof result === 'function') result = undefined;

    const variable = isAssignment && value !== undefined ? { label, value } : null;

    return { type, result: result instanceof Error ? result.message : result, variable };
  }

  // Turn mathjs's terse "Undefined symbol x" into a phrase-level message when
  // the unknown symbol is part of a multi-word name (`monthly rent`) or a
  // mangled forward reference (`__var_monthly_rent`). Single unknowns keep the
  // original message.
  function friendlyError(error, code, scope) {
    const message = error && error.message ? error.message : String(error);
    const match = /^Undefined symbol ([A-Za-z_][A-Za-z0-9_]*)$/.exec(message);
    if (!match) return message;
    const symbol = match[1];

    const original = unmangleName(symbol);
    if (original) return `"${original}" is not defined`;

    let expression = code;
    try {
      expression = preprocess(code);
    } catch {
      // keep the raw code
    }
    const run =
      /(?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*(?:\s+[A-Za-z_][A-Za-z0-9_]*)+)(?![A-Za-z0-9_])/g;
    let matchRun;
    while ((matchRun = run.exec(expression)) !== null) {
      const words = matchRun[1].split(/\s+/);
      if (!words.includes(symbol)) continue;
      const known = words.some(
        (word) => word !== symbol && (math[word] !== undefined || word in scope)
      );
      if (!known) return `"${matchRun[1]}" is not defined`;
    }
    return message;
  }

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

  /**
   * Evaluate a sheet line by line.
   * @param {string[]} inputLines
   * @returns {SheetResult}
   */
  function evaluateLines(inputLines) {
    // Multi-word variable names are normalised before diffing/evaluating, so the
    // cache stores the same form it compares against.
    const lines = mangleLines(inputLines);
    if (cache.revision !== environmentRevision) {
      cache.lines = [];
      cache.results = [];
      cache.revision = environmentRevision;
    }
    const startLine = (() => {
      let start = firstDifference(cache.lines, lines);
      if (start === -1) return start;
      // A group's subtotal lives on its header but depends on the lines below
      // it, so any change inside (or removing) a group must invalidate the
      // header too. Both the old and the new grouping are considered.
      const groups = [...findGroups(cache.lines).byEnd.values()].concat([
        ...findGroups(lines).byEnd.values(),
      ]);
      for (const group of groups) {
        if (start > group.start && start <= group.end) start = group.start;
      }
      return start;
    })();
    if (startLine === -1) {
      return { results: cache.results, total: computeTotal(cache.results), startLine };
    }

    // Reuse the results of unchanged lines and rebuild the evaluation context up
    // to the first changed line from the cached values (no mathjs evaluation).
    const results = cache.results.slice(0, startLine);
    const variables = {};
    let previousResult;
    let lastBlankIndex = -1;
    const groups = findGroups(lines);

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

      let parsed = parseLine(line);

      // A closing `end` row finalises the group: the subtotal is shown on the
      // header row (an aggregate result, so it never double counts in the
      // running total), while the `end` row itself stays inert.
      const endGroup = groups.byEnd.get(i);
      if (endGroup) {
        const value = aggregateAbove(results, endGroup.start + 1, i, 'sum');
        results[endGroup.start] = { type: 'value', value, aggregate: true };
        results[i] = { type: 'value', value: undefined };
        if (value !== undefined) previousResult = value;
        continue;
      }

      // An `end` row with no open group is a mistake, not an unknown symbol.
      if (parsed.code.trim() === 'end') {
        results[i] = { type: 'error', value: '"end" without a matching group header' };
        continue;
      }

      // Tags. A trailing tag (`20 #food`) labels this line, and a line that is
      // only tags (`#food`, or `sum #food`) aggregates the tagged rows above.
      // Tags used inside a calculation (`#food * 2`, `#food + #other`) are
      // substituted with their aggregate values and the line is evaluated.
      let tags = parsed.tags;
      let tagScope = null;
      if (tags.length && !parsed.valid) {
        const substituted = substituteTags(parsed, results, i);
        if (substituted.error) {
          results[i] = { type: 'error', value: substituted.error };
          continue;
        }
        tagScope = substituted.values;
        parsed = parseLine(substituted.text);
        tags = [];
      }
      if (tags.length) {
        const mode = tagAggregateMode(parsed.code);
        if (mode) {
          const value = tagAggregate(results, tags, i, mode);
          if (value === null) {
            results[i] = { type: 'error', value: tagError(tags) };
            continue;
          }
          results[i] = { type: 'value', value, aggregate: true };
          if (value !== undefined) previousResult = value;
          continue;
        }
      }

      if (parsed.isAssignment && AGGREGATE_KEYWORDS[parsed.label.toLowerCase()]) {
        results[i] = { type: 'error', value: `"${parsed.label}" is a reserved word` };
        continue;
      }

      const group = groups.groupOfLine.get(i);
      const blockStart = group ? group.start + 1 : lastBlankIndex + 1;
      const keyword = AGGREGATE_KEYWORDS[parsed.code.trim().toLowerCase()];

      if (keyword) {
        const value = aggregateAbove(results, blockStart, i, keyword);
        results[i] = { type: 'value', value, aggregate: true };
        if (value !== undefined) previousResult = value;
        continue;
      }

      const scope = { ...variables };
      if (tagScope) Object.assign(scope, tagScope);
      if (previousResult !== undefined) scope.prev = previousResult;

      let parsedLine = parsed;
      if (AGGREGATE_WORD.test(parsed.code)) {
        const blockSum = aggregateAbove(results, blockStart, i, 'sum');
        const blockAvg = aggregateAbove(results, blockStart, i, 'average');
        parsedLine = substituteAggregates(parsed, blockSum, blockAvg);
      }

      const resolved = resolveLineRefs(parsedLine, results, i);
      if (resolved.error) {
        results[i] = {
          type: 'error',
          value: resolved.error,
          tags: tags.length ? tags : undefined,
        };
        continue;
      }
      parsedLine = resolved.parsed;
      Object.assign(scope, resolved.values);

      const { type, result, variable } = evaluateLine(parsedLine, scope);
      if (variable) variables[variable.label] = variable.value;
      results[i] = {
        type,
        value: result,
        assigned: variable ? variable.value : undefined,
        tags: tags.length ? tags : undefined,
      };
      if (type !== 'error' && result !== undefined && typeof result !== 'function') {
        previousResult = result;
      }
    }

    cache.lines = lines;
    cache.results = results;

    // Tag every line of a closed group so the renderer can shade it. Cleared
    // first so a removed group cannot leave stale roles on reused results.
    for (const result of results) {
      if (result) delete result.group;
    }
    for (const [lineIndex, group] of groups.groupOfLine) {
      const result = results[lineIndex];
      if (!result) continue;
      result.group =
        lineIndex === group.start ? 'header' : lineIndex === group.end ? 'end' : 'body';
    }

    return { results, total: computeTotal(results), startLine };
  }

  function registerCurrencyRates(data) {
    registerRates(math, data);
    environmentRevision++;
  }

  // Re-register the volume units for a measurement system and invalidate the
  // cache, so switching metric/us/imperial recomputes every line.
  function registerMeasurementSystem(system) {
    applyMeasurementSystem(math, system);
    environmentRevision++;
  }

  if (typeof window !== 'undefined') {
    // The main-thread fallback registers rates through its own currency:updated
    // listener, so invalidate there too or cached conversions would go stale.
    window.addEventListener('currency:updated', () => {
      environmentRevision++;
    });
    window.addEventListener('measurement:updated', (event) => {
      if (event.detail) registerMeasurementSystem(event.detail);
    });
  }

  return { evaluateLine, evaluateLines, registerCurrencyRates, registerMeasurementSystem };
}

// The default engine shared by the worker, the main-thread fallback and the
// tests. Lazily built on first use, so importing this module never constructs
// the mathjs bundle.
let sharedEngine = null;
function getEngine() {
  return sharedEngine || (sharedEngine = createEngine());
}

function evaluateLines(lines) {
  return getEngine().evaluateLines(lines);
}

function evaluateLine(line, scope) {
  return getEngine().evaluateLine(line, scope);
}

function registerCurrencyRates(data) {
  getEngine().registerCurrencyRates(data);
}

function registerMeasurementSystem(system) {
  getEngine().registerMeasurementSystem(system);
}

export {
  createEngine,
  evaluateLines,
  evaluateLine,
  registerCurrencyRates,
  registerMeasurementSystem,
};
