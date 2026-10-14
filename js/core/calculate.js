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
import { lockDown } from './engineLock.js';
import { limitSizes } from './sizeLimits.js';
import { friendlyError } from './friendlyErrors.js';
import { substituteAggregates } from './aggregateSubstitution.js';
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
 * The worker path (see `worker.js`) matches this shape except where the
 * structured clone cannot: `value` is pre-formatted to a string, and
 * `assigned` is dropped (functions cannot clone). Every other field is
 * clone-safe and rides along, so the two paths agree on shape.
 *
 * @typedef {Object} LineResult
 * @property {('value'|'assignment'|'error')} type
 * @property {*} value
 * @property {*} [assigned]  Engine path only; stripped by the worker.
 * @property {boolean} [aggregate]
 * @property {boolean} [unitDef]
 * @property {string[]} [tags]
 * @property {('header'|'body'|'end')} [group]
 */

/**
 * @typedef {Object} SheetResult
 * @property {LineResult[]} results
 * @property {*} total  The running total: a number/Unit (engine path) or a
 *   pre-formatted string (worker path); an error message string when the
 *   aggregate fails (e.g. mixed currencies).
 * @property {number} startLine  First line that changed (-1 when input is unchanged).
 */

// Matches a standalone aggregate keyword, i.e. not a mathjs function call
// like `sum([1, 2, 3])`. The words come from AGGREGATE_KEYWORDS.
const AGGREGATE_WORD = new RegExp(`\\b(?:${AGGREGATE_WORD_SOURCE})\\b(?!\\s*\\()`, 'i');

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
// A variable is bound by defining the property, which also replaces a failure
// marker (below) that a plain assignment could not overwrite.
function bindVariable(variables, label, value) {
  Object.defineProperty(variables, label, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

// Bind a name whose assignment failed. Reading it raises the error instead of
// quietly finding an older value, or a unit or constant of the same name, which
// the line that failed was meant to replace (REVIEW.md AGG-03). Assigning to it
// again, from any scope that inherits it, defines the new value on that scope.
function bindFailure(variables, label, line) {
  Object.defineProperty(variables, label, {
    get() {
      throw new Error(`"${label}" has an error on line ${line}`);
    },
    set(value) {
      bindVariable(this, label, value);
    },
    enumerable: true,
    configurable: true,
  });
}

const PLAIN_LABEL = /^[A-Za-z_]\w*$/;

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
  // mathjs decides when a function body is compiled whether a free symbol names a
  // unit, so a function defined above a `unit` line never saw that unit. A symbol
  // that is neither a variable nor a unit when the body was compiled ends up in
  // `onUndefinedSymbol` when the function is called, which is the moment to look
  // again (AGG-04).
  const { SymbolNode, Unit } = math;
  const undefinedSymbol = SymbolNode.onUndefinedSymbol;
  SymbolNode.onUndefinedSymbol = (name) =>
    Unit.isValuelessUnit(name) ? new Unit(null, name) : undefinedSymbol(name);
  // `simplify()` picks the unit to show a compound result in from the unit system.
  // mathjs's default, `auto`, remembers the last unit of each dimension it parsed
  // anywhere (other lines, deleted lines, other tabs, startup), so the same line
  // read `gallon` or `BTU` depending on what else was in the sheet (UNIT-02). A
  // fixed system makes the unit depend only on the line.
  math.Unit.setUnitSystem('si');
  // The size-taking constructors refuse to allocate past the list cap (PRE-01).
  limitSizes(math);
  // From here a sheet cannot reach `config`, `createUnit` or the functions that
  // evaluate text; the engine keeps the real ones through `trusted` (PRE-02).
  const trusted = lockDown(math);

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

  // The sheet's variables. There is one object for the engine's whole life and it
  // is cleared and refilled whenever the context is rebuilt: a user function keeps
  // the scope it was defined in, so a fresh object per run would leave every
  // function defined above the first changed line reading variables from a run
  // that no longer exists (stale, deleted or later-assigned values; AGG-01).
  const engineVariables = {};

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
      assertBoundedExpression(trusted, expression, scope);
      result = trusted.evaluate(expression, scope);
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
    for (let i = userUnits.length - 1; i >= 0; i--) removeUserUnit(trusted, userUnits[i]);
    userUnits = [];
  }

  // Re-register a unit from a cached definition while rebuilding the context
  // before the first changed line (no re-evaluation needed).
  function rebuildUserUnit(name, value) {
    try {
      userUnits.push(createUserUnit(trusted, name, value, { valueIsUnit: isUnitValue(value) }));
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
      userUnits.push(createUserUnit(trusted, name, value, { valueIsUnit: isUnitValue(value) }));
    } catch (error) {
      return { error: error.message };
    }
    return { value };
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
    const variables = engineVariables;
    for (const key of Object.keys(variables)) delete variables[key];
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

      // A variable comes back only from a row that really assigned it, under the
      // label that row recorded. Reading the line text instead restored the error
      // text of a failed assignment as the variable's value, and lost assignments
      // whose line was rewritten before evaluation (`x = #a + #b`; SHEET-01).
      const assignment = results[i];
      if (assignment && assignment.type === 'error' && assignment.failedLabel) {
        bindFailure(variables, assignment.failedLabel, i + 1);
      } else if (
        assignment &&
        assignment.type === 'assignment' &&
        assignment.label &&
        assignment.assigned !== undefined
      ) {
        bindVariable(variables, assignment.label, assignment.assigned);
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
    if (typeof value === 'string') {
      ctx.results[endGroup.start] = { type: 'error', value };
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
    if (typeof value === 'string') {
      ctx.results[ctx.i] = { type: 'error', value };
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
    const keyword = !(bare in ctx.variables) ? AGGREGATE_KEYWORDS[bare.toLowerCase()] : undefined;
    if (!keyword) return false;
    const value = aggregateAbove(ctx.results, blockStart, ctx.i, keyword);
    if (typeof value === 'string') {
      ctx.results[ctx.i] = { type: 'error', value };
      return true;
    }
    ctx.results[ctx.i] = { type: 'value', value, aggregate: true };
    if (value !== undefined) ctx.previousResult = value;
    return true;
  }

  // The variable an indexed or property assignment changes: `n` in `n[2] = 99`,
  // `p` in `p.x = 5`. Not a function definition (`f(x) = …`).
  const ELEMENT_TARGET = /^([A-Za-z_]\w*)\s*[[.]/;
  // The name a plain function definition gives: `f` in `f(x) = x * 2`.
  const FUNCTION_TARGET = /^([A-Za-z_]\w*)\s*\(/;

  // Record an error row. When the line was an assignment to a plain name, that name
  // is bound to the failure (and remembered on the row, so a rebuild binds it
  // again) instead of keeping an older value (AGG-03).
  function failLine(ctx, parsed, message) {
    const label =
      parsed.isAssignment && PLAIN_LABEL.test(parsed.label || '') ? parsed.label : undefined;
    ctx.results[ctx.i] = {
      type: 'error',
      value: message,
      tags: ctx.tags.length ? ctx.tags : undefined,
      failedLabel: label,
    };
    if (label) {
      bindFailure(ctx.variables, label, ctx.i + 1);
      ctx.names.add(label);
    }
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
        typeof blockSum === 'string' ? blockSum : typeof blockAvg === 'string' ? blockAvg : null;
      if (conflict) return failLine(ctx, ctx.parsed, conflict);
      const substituted = substituteAggregates(ctx.parsed, blockSum, blockAvg, ctx.variables);
      parsedLine = substituted.parsed;
      aggregateValues = substituted.values;
    }

    const resolved = resolveLineRefs(parsedLine, ctx.results, ctx.i);
    if (resolved.error) return failLine(ctx, parsedLine, resolved.error);
    parsedLine = resolved.parsed;
    Object.assign(scope, resolved.values);
    if (aggregateValues) Object.assign(scope, aggregateValues);

    // mathjs changes a list or object in place when an element is assigned, and
    // that object is also held by the rows above, by every variable that was set
    // from it and by `prev`. So the assignment works on a private copy of its
    // base, and the base's new value is recorded as the variable (SHEET-03).
    const elementBase = parsedLine.isAssignment
      ? (ELEMENT_TARGET.exec(parsedLine.label || '') || [])[1]
      : undefined;
    if (elementBase && Object.hasOwn(ctx.variables, elementBase)) {
      scope[elementBase] = math.clone(ctx.variables[elementBase]);
    }

    const evaluated = evaluateLine(parsedLine, scope, namesIn(ctx, scope));
    const { type, result } = evaluated;
    if (type === 'error') return failLine(ctx, parsedLine, result);
    let { variable } = evaluated;
    if (elementBase && type === 'assignment' && Object.hasOwn(scope, elementBase)) {
      variable = { label: elementBase, value: scope[elementBase] };
    }
    // `f(x) = x * 2` defines `f` in this line's own scope, which is dropped after
    // the line, and the label `f(x)` is no name an expression can reach. Keep the
    // function under its name, so later lines (and a built-in it shadows) see it
    // (SHEET-04). The `alias = f(x) = …` form already stores the alias.
    const functionName = parsedLine.isAssignment
      ? (FUNCTION_TARGET.exec(parsedLine.label || '') || [])[1]
      : undefined;
    if (
      functionName &&
      type === 'assignment' &&
      Object.hasOwn(scope, functionName) &&
      typeof scope[functionName] === 'function'
    ) {
      variable = { label: functionName, value: scope[functionName] };
    }
    if (variable) {
      bindVariable(ctx.variables, variable.label, variable.value);
      ctx.names.add(variable.label);
    }
    ctx.results[ctx.i] = {
      type,
      value: result,
      assigned: variable ? variable.value : undefined,
      label: variable ? variable.label : undefined,
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

  // The table last registered, as text. The same table arrives twice on every
  // load (the startup seed, then the cached rates event), and each registration
  // invalidates the whole per-line cache, so an identical table is ignored
  // (CORE-10).
  let registeredRates = rates ? JSON.stringify(rates) : null;

  function registerCurrencyRates(data) {
    const key = JSON.stringify(data ?? null);
    if (key === registeredRates) return;
    registeredRates = key;
    registerRates(trusted, data);
    environmentRevision++;
  }

  // Re-register the volume units for a measurement system and invalidate the
  // cache, so switching metric/us/imperial recomputes every line.
  function registerMeasurementSystem(system) {
    applyMeasurementSystem(trusted, system);
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
