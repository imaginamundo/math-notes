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
import initTimespan from '../eval/timespan.js';
import initCalendar from '../eval/calendar.js';
import { readMeasurementSystem } from './measurementSystem.js';
import { readTotalMode } from './totalMode.js';
import preprocess from './preprocess.js';
import {
  AGGREGATE_KEYWORDS,
  AGGREGATE_WORD_SOURCE,
  aggregateAbove,
  computeTotal,
} from './aggregate.js';
import { unitMixError } from './unitMix.js';
import { tagAggregate, tagAggregateMode, tagError, substituteTags } from './tags.js';
import { resolveLineRefs } from './lineRefs.js';
import { assertBoundedExpression } from './boundedExpression.js';
import { friendlyError } from './friendlyErrors.js';
import { firstDifference } from '../util/sequence.js';
import { mangleLines } from './multiWordVariables.js';
import { unitDefinition } from './userUnits.js';
import { createUserUnit, removeUserUnit } from '../eval/userUnits.js';

/**
 * One row's result. Every `results[i]` is exactly one of these variants:
 *
 * - `{ type: 'value', value }` — a normal computed row. `value` is a plain
 *   number/Unit/Date/list/object on the engine path, and an already formatted
 *   string on the worker path (see `worker.js`). It is `undefined` for a blank
 *   or comment row, and for a group's closing `end` row.
 * - `{ type: 'value', value, aggregate: true }` — an aggregate row: a group
 *   header's subtotal, a bare `sum`/`average`/`total`/`avg` row, or a line that
 *   is only `#tags`. `aggregate` keeps it out of the running total so the rows
 *   it sums are not counted twice.
 * - `{ type: 'value', value, aggregate: true, unitDef: true }` — a user-defined
 *   unit line (`unit widget = 3.5 kg`). `value` is the definition, shown as the
 *   row's result but kept out of totals and `prev`. Also tracked on the engine so
 *   the unit can be re-registered when the definition changes.
 * - `{ type: 'assignment', value, assigned }` — an assignment. `assigned` is
 *   the value to store (functions and Dates survive there); `value` mirrors it
 *   for display.
 * - `{ type: 'error', value }` — `value` is the human-readable message.
 *
 * `tags` is present (non-empty) only on rows that carry `#tags`. `group` is
 * present only on the rows of a closed group (`'header'`, `'body'`, `'end'`),
 * so the renderer can shade the block.
 *
 * @typedef {Object} LineResult
 * @property {('value'|'assignment'|'error')} type
 * @property {*} value
 * @property {*} [assigned]
 * @property {boolean} [aggregate]
 * @property {string[]} [tags]
 * @property {('header'|'body'|'end')} [group]
 */

/**
 * @typedef {Object} SheetResult
 * @property {LineResult[]} results
 * @property {*} total  The running total (number, Unit, or formatted string).
 * @property {number} startLine  First line that changed (-1 when input is unchanged).
 */

// Matches a standalone aggregate keyword, i.e. not a mathjs function call
// like `sum([1, 2, 3])`. The words come from AGGREGATE_KEYWORDS.
const AGGREGATE_WORD = new RegExp(`\\b(?:${AGGREGATE_WORD_SOURCE})\\b(?!\\s*\\()`, 'i');
const AGGREGATE_WORD_ALL = new RegExp(`\\b(${AGGREGATE_WORD_SOURCE})\\b(?!\\s*\\()`, 'gi');

// Labels a line may not assign to: `prev` and the unconditional date keywords
// (rewritten before mathjs, so a variable of that name could never be read
// back) and the whole `__` namespace, which holds the engine's own helpers and
// the generated names multi-word variables are mangled to. Aggregate keywords
// (`sum`/`total`/…) are deliberately not here: assigning one makes the variable
// shadow the keyword from then on. Checked against the raw label, before
// mangling, so a multi-word variable (which becomes `__var_...`) is never
// mistaken for a reserved name.
const RESERVED_LABELS = new Set([
  'prev',
  'today',
  'now',
  'yesterday',
  'tomorrow',
  'christmas',
  'halloween',
  // `total` is the running-total aggregate and `unit` opens a unit definition.
  'total',
  'unit',
]);

function isReservedLabel(label) {
  return RESERVED_LABELS.has(label.toLowerCase()) || label.startsWith('__');
}

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

/**
 * Build an isolated evaluation engine: its own mathjs instance (aliases, css
 * and currency units configured), its own incremental result cache and its own
 * currency-rate revision. Nothing is constructed at import time, and rates are
 * an argument — the engine never reads storage or subscribes to events.
 * @param {{ rates?: { base: string, rates: Record<string, number> } }} [options]
 */
function createEngine({ rates } = {}) {
  const math = create(all);
  initAliases(math);
  initCssUnits(math);
  initUnits(math);
  initDatetime(math);
  initRounding(math);
  initMeasures(math, readMeasurementSystem());
  initRates(math);
  initTimespan(math);
  initCalendar(math);
  initCurrency(math, rates);

  const cache = {
    lines: [],
    results: [],
    groups: findGroups([]),
    revision: -1,
  };

  // Bumped whenever evaluation semantics change without the lines changing
  // (currency rates registered), so the cache cannot serve stale results.
  let environmentRevision = 0;

  // Which aggregate the total bar shows. Only affects the total, not the
  // per-line cache, so it is read fresh on each evaluation.
  let totalMode = readTotalMode();

  // The user-defined units of the current sheet, in definition order, so they
  // can be deleted and rebuilt when the definitions change.
  let userUnits = [];

  // The default name set for a scope built by hand (unit definitions, the
  // public `evaluateLine`): every own key of the object it was handed.
  function ownNames(scope) {
    return new Set(Object.keys(scope));
  }

  // What `preprocess` sees for one line: the sheet's running variables plus
  // whatever only this line put in its own scope (`prev`, tag aggregates, line
  // references). A view over both, so a sheet with thousands of variables never
  // rebuilds the whole set per line — that, together with copying the scope
  // per line, is what used to make a sheet of assignments cost O(lines²).
  function namesIn(ctx, scope) {
    return { has: (name) => ctx.names.has(name) || Object.hasOwn(scope, name) };
  }

  function evaluateLine(line, scope, names) {
    const parsed = typeof line === 'string' ? parseLine(line) : line;
    const { code, label, isAssignment } = parsed;
    let type = isAssignment ? 'assignment' : 'value';
    let value;
    let result;

    try {
      const expression = preprocess(code, scope && { names: names || ownNames(scope) });
      assertBoundedExpression(math, expression, scope);
      result = math.evaluate(expression, scope);
      const mixError = unitMixError(result);
      if (mixError) throw new Error(mixError);
      // The assignment statement already returns the rhs value; reuse it rather
      // than evaluating the rhs a second time, which could disagree for impure
      // expressions (e.g. `x = unix()`).
      value = isAssignment ? result : undefined;
    } catch (error) {
      result = friendlyError(math, error, code, scope);
      value = undefined;
      type = 'error';
    }

    if (typeof result === 'function') result = undefined;

    const variable = isAssignment && value !== undefined ? { label, value } : null;

    return { type, result: result instanceof Error ? result.message : result, variable };
  }

  function isUnitValue(value) {
    return value !== null && typeof value === 'object' && value.isUnit === true;
  }

  // Remove every user-defined unit so the sheet's definitions can be rebuilt
  // from scratch (editing or deleting a definition must not leave a stale unit).
  function resetUserUnits() {
    for (let i = userUnits.length - 1; i >= 0; i--) removeUserUnit(math, userUnits[i]);
    userUnits = [];
  }

  // Re-register a unit from a cached definition while rebuilding the context
  // before the first changed line (no re-evaluation needed).
  function rebuildUserUnit(name, value) {
    try {
      userUnits.push(createUserUnit(math, name, value, { valueIsUnit: isUnitValue(value) }));
    } catch {
      // The use sites will report the missing unit.
    }
  }

  // Evaluate a definition line's value and register the unit. Returns the value
  // to display, or an error message.
  function defineUserUnit(name, definition, scope, names) {
    if (isReservedLabel(name) || name.toLowerCase() === 'end') {
      return { error: `"${name}" is a reserved word` };
    }
    const evaluated = evaluateLine(
      { code: definition, label: '', isAssignment: false, rhs: '' },
      scope,
      names
    );
    if (evaluated.type === 'error') return { error: evaluated.result };
    const value = evaluated.result;
    if (!isUnitValue(value) && (typeof value !== 'number' || !Number.isFinite(value))) {
      return { error: 'A unit definition must be a number or a unit' };
    }
    try {
      userUnits.push(createUserUnit(math, name, value, { valueIsUnit: isUnitValue(value) }));
    } catch (error) {
      return { error: error.message };
    }
    return { value };
  }

  // Replace aggregate keywords in an expression with scope variables holding the
  // block's values, rather than pasting the value into the text. Pasting broke
  // precedence (`-5` then `sum^2` read as `-5^2`) and units (`sum * 2 kg`); a
  // scope variable is a real value, exactly like `line(n)`. A keyword the user
  // has redefined as a variable is left alone, so the variable shadows it.
  function substituteAggregates(parsed, sum, average, variables) {
    const values = {};
    let count = 0;
    const replace = (expression) =>
      expression.replace(AGGREGATE_WORD_ALL, (word) => {
        if (variables[word] !== undefined) return word;
        const value = AGGREGATE_KEYWORDS[word.toLowerCase()] === 'average' ? average : sum;
        const token = `__agg_${count++}`;
        values[token] = value;
        return token;
      });

    if (parsed.isAssignment) {
      const rhs = replace(parsed.rhs);
      return { parsed: { ...parsed, code: `${parsed.label} = ${rhs}`, rhs }, values };
    }
    return {
      parsed: {
        ...parsed,
        code: replace(parsed.code),
        rhs: parsed.rhs ? replace(parsed.rhs) : parsed.rhs,
      },
      values,
    };
  }

  // Whether a result row becomes the `prev` for later lines. A group header's
  // subtotal is an aggregate, so it only counts as `prev` when the matching
  // `end` is reached (handled by the caller); errors and functions never count.
  // One definition, used by both the replay and the evaluate loops, so their
  // notion of `prev` cannot drift apart.
  function feedsPrev(result) {
    return Boolean(
      result &&
      result.type !== 'error' &&
      result.value !== undefined &&
      typeof result.value !== 'function'
    );
  }

  // Rebuild the evaluation context up to the first changed line from the cached
  // results (no mathjs evaluation): the variables in scope, the running `prev`,
  // and the last blank line that starts an aggregate block.
  function replayContext(lines, inputLines, results, groups, startLine) {
    const variables = {};
    let previousResult;
    let lastBlankIndex = -1;
    // A group header's cached value is the group subtotal, but the main loop
    // only feeds it to `previousResult` when the matching `end` is reached, not
    // at the header line. Mirror that here or a `prev` after the group would see
    // the stale last body value.
    const headerStarts = new Set([...groups.byEnd.values()].map((group) => group.start));

    for (let i = 0; i < startLine; i++) {
      const line = lines[i];
      if (line.trim() === '' && !groups.groupOfLine.has(i)) lastBlankIndex = i;

      const unit = unitDefinition(inputLines[i]);
      if (unit) {
        const stored = results[i];
        if (stored && stored.value !== undefined) rebuildUserUnit(unit.name, stored.value);
        continue;
      }

      const parsed = parseLine(line);
      if (parsed.isAssignment) {
        const stored = results[i];
        const assigned = stored
          ? stored.assigned !== undefined
            ? stored.assigned
            : stored.value
          : undefined;
        if (assigned !== undefined) variables[parsed.label] = assigned;
      }
      const endGroup = groups.byEnd.get(i);
      const result = results[i];
      if (endGroup) {
        // A closed group leaves `prev` at the subtotal shown on its header.
        const header = results[endGroup.start];
        if (header && header.value !== undefined) previousResult = header.value;
      } else if (!headerStarts.has(i) && feedsPrev(result)) {
        previousResult = result.value;
      }
    }

    return { variables, previousResult, lastBlankIndex };
  }

  // The per-line cases, in order. A handler returns true when it has produced
  // the row, so the caller stops; `handleExpression` always handles, so no line
  // falls through. They share one `context` object because the cases build on
  // each other (a tag line is rewritten before it is evaluated).
  function handleGroupEnd(ctx) {
    const endGroup = ctx.groups.byEnd.get(ctx.i);
    if (!endGroup) return false;
    const value = aggregateAbove(ctx.results, endGroup.start + 1, ctx.i, 'sum');
    if (value instanceof Error) {
      ctx.results[endGroup.start] = { type: 'error', value: value.message };
      ctx.results[ctx.i] = { type: 'value', value: undefined };
      return true;
    }
    ctx.results[endGroup.start] = { type: 'value', value, aggregate: true };
    ctx.results[ctx.i] = { type: 'value', value: undefined };
    if (value !== undefined) ctx.previousResult = value;
    return true;
  }

  function handleStrayEnd(ctx) {
    if (ctx.parsed.code.trim() !== 'end') return false;
    ctx.results[ctx.i] = { type: 'error', value: '"end" without a matching group header' };
    return true;
  }

  function handleUnitDefinition(ctx) {
    const unit = unitDefinition(ctx.inputLines[ctx.i]);
    if (!unit) return false;
    const scope = Object.create(ctx.variables);
    const outcome = defineUserUnit(unit.name, parseLine(ctx.line).rhs, scope, namesIn(ctx, scope));
    ctx.results[ctx.i] = outcome.error
      ? { type: 'error', value: outcome.error }
      : { type: 'value', value: outcome.value, aggregate: true, unitDef: true };
    return true;
  }

  // A tag used in a calculation (`#food * 2`) is substituted with the tag's
  // aggregate and then handled by the later cases, so this one returns false.
  function handleTagSubstitution(ctx) {
    if (!(ctx.tags.length && !ctx.parsed.valid)) return false;
    const substituted = substituteTags(ctx.parsed, ctx.results, ctx.i, math);
    if (substituted.error) {
      ctx.results[ctx.i] = { type: 'error', value: substituted.error };
      return true;
    }
    ctx.tagScope = substituted.values;
    ctx.parsed = parseLine(substituted.text);
    ctx.tags = [];
    return false;
  }

  function handleTagAggregate(ctx) {
    if (!ctx.tags.length) return false;
    const mode = tagAggregateMode(ctx.parsed.code);
    if (!mode) return false;
    const value = tagAggregate(ctx.results, ctx.tags, ctx.i, mode, math);
    if (value instanceof Error) {
      ctx.results[ctx.i] = { type: 'error', value: value.message };
      return true;
    }
    if (value === null) {
      ctx.results[ctx.i] = { type: 'error', value: tagError(ctx.tags) };
      return true;
    }
    ctx.results[ctx.i] = { type: 'value', value, aggregate: true };
    if (value !== undefined) ctx.previousResult = value;
    return true;
  }

  function handleReservedLabel(ctx) {
    if (!(ctx.original.isAssignment && isReservedLabel(ctx.original.label))) return false;
    ctx.results[ctx.i] = { type: 'error', value: `"${ctx.original.label}" is a reserved word` };
    return true;
  }

  function handleBareAggregate(ctx) {
    const group = ctx.groups.groupOfLine.get(ctx.i);
    const blockStart = group ? group.start + 1 : ctx.lastBlankIndex + 1;
    const bare = ctx.parsed.code.trim();
    // A variable named like an aggregate keyword shadows it (`total = 5`).
    const keyword =
      ctx.variables[bare] === undefined ? AGGREGATE_KEYWORDS[bare.toLowerCase()] : undefined;
    if (!keyword) return false;
    const value = aggregateAbove(ctx.results, blockStart, ctx.i, keyword);
    if (value instanceof Error) {
      ctx.results[ctx.i] = { type: 'error', value: value.message };
      return true;
    }
    ctx.results[ctx.i] = { type: 'value', value, aggregate: true };
    if (value !== undefined) ctx.previousResult = value;
    return true;
  }

  function handleExpression(ctx) {
    const group = ctx.groups.groupOfLine.get(ctx.i);
    const blockStart = group ? group.start + 1 : ctx.lastBlankIndex + 1;
    // The sheet's variables are reached through the prototype rather than
    // copied in: the copy alone was O(variables) for every line of the sheet.
    // What only this line needs (`prev`, tag aggregates, line references) is
    // assigned below as own properties of this fresh object, so nothing from a
    // previous line survives into this one.
    const scope = Object.create(ctx.variables);
    if (ctx.tagScope) Object.assign(scope, ctx.tagScope);
    if (ctx.previousResult !== undefined) scope.prev = ctx.previousResult;

    let parsedLine = ctx.parsed;
    let aggregateValues = null;
    if (AGGREGATE_WORD.test(ctx.parsed.code)) {
      const blockSum = aggregateAbove(ctx.results, blockStart, ctx.i, 'sum');
      const blockAvg = aggregateAbove(ctx.results, blockStart, ctx.i, 'average');
      const conflict =
        blockSum instanceof Error ? blockSum : blockAvg instanceof Error ? blockAvg : null;
      if (conflict) {
        ctx.results[ctx.i] = {
          type: 'error',
          value: conflict.message,
          tags: ctx.tags.length ? ctx.tags : undefined,
        };
        return true;
      }
      const substituted = substituteAggregates(ctx.parsed, blockSum, blockAvg, ctx.variables);
      parsedLine = substituted.parsed;
      aggregateValues = substituted.values;
    }

    const resolved = resolveLineRefs(parsedLine, ctx.results, ctx.i);
    if (resolved.error) {
      ctx.results[ctx.i] = {
        type: 'error',
        value: resolved.error,
        tags: ctx.tags.length ? ctx.tags : undefined,
      };
      return true;
    }
    parsedLine = resolved.parsed;
    Object.assign(scope, resolved.values);
    if (aggregateValues) Object.assign(scope, aggregateValues);

    const { type, result, variable } = evaluateLine(parsedLine, scope, namesIn(ctx, scope));
    if (variable) {
      ctx.variables[variable.label] = variable.value;
      ctx.names.add(variable.label);
    }
    ctx.results[ctx.i] = {
      type,
      value: result,
      assigned: variable ? variable.value : undefined,
      tags: ctx.tags.length ? ctx.tags : undefined,
    };
    if (feedsPrev(ctx.results[ctx.i])) ctx.previousResult = result;
    return true;
  }

  const LINE_HANDLERS = [
    handleGroupEnd,
    handleStrayEnd,
    handleUnitDefinition,
    handleTagSubstitution,
    handleTagAggregate,
    handleReservedLabel,
    handleBareAggregate,
    handleExpression,
  ];

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
      cache.groups = findGroups([]);
      cache.revision = environmentRevision;
    }
    const changed = firstDifference(cache.lines, lines);
    if (changed === -1) {
      return {
        results: cache.results,
        total: computeTotal(cache.results, totalMode),
        startLine: -1,
      };
    }
    const groups = findGroups(lines);
    // A group's subtotal lives on its header but depends on the lines below it,
    // so any change inside (or removing) a group must invalidate the header too.
    // The old grouping is the cached one, so only the new lines are scanned.
    let startLine = changed;
    for (const group of [...cache.groups.byEnd.values(), ...groups.byEnd.values()]) {
      if (startLine > group.start && startLine <= group.end) startLine = group.start;
    }

    // Rebuild the sheet's user-defined units from scratch: drop the previous
    // set, then recreate the definitions before the first changed line from the
    // cache and the rest while evaluating.
    resetUserUnits();

    // Reuse the results of unchanged lines and rebuild the evaluation context up
    // to the first changed line from the cached values (no mathjs evaluation).
    const results = cache.results.slice(0, startLine);
    const replayed = replayContext(lines, inputLines, results, groups, startLine);
    const context = {
      lines,
      inputLines,
      results,
      groups,
      variables: replayed.variables,
      // The names the preprocessors may ask about, grown as the loop assigns.
      // Built once per run rather than from the scope for every line.
      names: new Set(Object.keys(replayed.variables)),
      previousResult: replayed.previousResult,
      lastBlankIndex: replayed.lastBlankIndex,
      i: 0,
      line: '',
      parsed: null,
      original: null,
      tags: [],
      tagScope: null,
    };

    for (let i = startLine; i < lines.length; i++) {
      context.i = i;
      context.line = lines[i];
      if (context.line.trim() === '' && !groups.groupOfLine.has(i)) context.lastBlankIndex = i;
      context.parsed = parseLine(context.line);
      context.original = parseLine(inputLines[i]);
      context.tags = context.parsed.tags;
      context.tagScope = null;
      for (const handle of LINE_HANDLERS) {
        if (handle(context)) break;
      }
    }

    cache.lines = lines;
    cache.results = results;
    cache.groups = groups;

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

    return { results, total: computeTotal(results, totalMode), startLine };
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

  // The total mode only changes how the total is aggregated, not the per-line
  // results, so the cache stays valid.
  function registerTotalMode(mode) {
    totalMode = mode;
  }

  return {
    evaluateLine,
    evaluateLines,
    registerCurrencyRates,
    registerMeasurementSystem,
    registerTotalMode,
  };
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

function registerTotalMode(mode) {
  getEngine().registerTotalMode(mode);
}

export {
  createEngine,
  evaluateLines,
  evaluateLine,
  registerCurrencyRates,
  registerMeasurementSystem,
  registerTotalMode,
};
