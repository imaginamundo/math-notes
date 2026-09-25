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
import { AGGREGATE_KEYWORDS, aggregateAbove, computeTotal } from './aggregate.js';
import { unitMixError } from './unitMix.js';
import { firstDifference } from '../util/sequence.js';
import { mangleLines, unmangleName } from './multiWordVariables.js';
import { unitDefinition } from './userUnits.js';
import { createUserUnit, removeUserUnit } from '../eval/userUnits.js';
import { IDENTIFIER_SRC, TAG_NAME_SRC, WORD } from './identifiers.js';

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

// Guard against expressions that would materialise unbounded arrays. A range
// like `1:1000000000` or a function over one (e.g. `sum(1:1e9)`) allocates the
// whole list up front and would lock the worker up, so reject anything a
// literal array or a (statically resolvable) range would expand beyond this.
const MAX_LIST_LENGTH = 100;

// Matches a standalone aggregate keyword, i.e. not a mathjs function call
// like `sum([1, 2, 3])`.
const AGGREGATE_WORD = /\b(?:sum|total|average|avg)\b(?!\s*\()/i;
const AGGREGATE_WORD_ALL = /\b(sum|total|average|avg)\b(?!\s*\()/gi;

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
// as the running total. A row tagged for several people is the item's full
// amount, split equally between them, so each tag gets its share while the row
// itself (and the group total) keeps the full price. Returns null when no row
// carries any of the requested tags.
function tagAggregate(results, tags, toIndex, mode, math) {
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
  const shares = tagged.map((result) => ({
    type: 'value',
    value: splitShare(result.value, result.tags.length, math),
  }));
  return aggregateAbove(shares, 0, shares.length, mode);
}

// One person's share of a value split `count` ways (a number or a Unit).
function splitShare(value, count, math) {
  if (count <= 1) return value;
  if (typeof value === 'number') return value / count;
  if (value && value.isUnit === true) return math.multiply(value, 1 / count);
  return value;
}

function tagError(tags) {
  return `No values tagged ${tags.map((tag) => `#${tag}`).join(', ')}`;
}

// Rewrite a line whose tags take part in the calculation (`#food * 2`) so each
// `#tag` becomes a scope variable holding the tag's aggregate over the rows
// above. Returns the rewritten text, the values to inject, or an error when a
// tag has no tagged rows.
function substituteTags(parsed, results, index, math) {
  const text = parsed.rawCode + parsed.tail.slice(0, parsed.tail.length - parsed.comment.length);
  const values = {};
  let error = null;

  const substituted = text.replace(new RegExp(`#(${TAG_NAME_SRC})`, 'gu'), (match, tag) => {
    const name = `__tag_${tag.replace(/[^\p{L}\p{N}\p{M}_]/gu, '_')}`;
    if (name in values) return name;
    if (error) return match;
    const value = tagAggregate(results, [tag], index, 'sum', math);
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
  initTimespan(math);
  initCalendar(math);
  initCurrency(math);

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

  function assertBoundedExpression(expression, scope) {
    // Only a list literal or a range can materialise unboundedly; skip the
    // extra parse for every other expression.
    if (!/\[|:/.test(expression)) return;
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
      const mixError = unitMixError(result);
      if (mixError) throw new Error(mixError);
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
  function defineUserUnit(name, definition, scope) {
    if (isReservedLabel(name) || name.toLowerCase() === 'end') {
      return { error: `"${name}" is a reserved word` };
    }
    const evaluated = evaluateLine(
      { code: definition, label: '', isAssignment: false, rhs: '' },
      scope
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

  // The identifier after `to`/`in`/`as` when it names a scope variable rather
  // than a Unit, so a conversion error can point at the shadowing variable.
  function conversionTarget(code, scope) {
    const match = /(?:^|\s)(?:to|in|as)\s+([A-Za-z_]\w*)\s*$/i.exec(code.trim());
    if (!match) return null;
    const name = match[1];
    const value = scope[name];
    if (value === undefined || value === null) return null;
    if (typeof value === 'object' && value.isUnit === true) return null;
    return name;
  }

  // Turn mathjs's terse "Undefined symbol x" into a phrase-level message when
  // the unknown symbol is part of a multi-word name (`monthly rent`) or a
  // mangled forward reference (`__var_monthly_rent`). Single unknowns keep the
  // original message.
  function friendlyError(error, code, scope) {
    const message = error && error.message ? error.message : String(error);

    // `5km to m` after `m = …`: the variable shadows the metre unit, so mathjs
    // hands a number to `to`. Name the variable instead of leaking the type
    // error.
    if (/Unexpected type of argument in function to\b/.test(message)) {
      const target = conversionTarget(code, scope);
      if (target) {
        return `"${target}" is a variable, so it cannot be used as a unit in a conversion. Rename the variable to convert to ${target}.`;
      }
    }

    const match = new RegExp(`^Undefined symbol (${IDENTIFIER_SRC})$`, 'u').exec(message);
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
    const run = new RegExp(
      `(?<![${WORD}_])(${IDENTIFIER_SRC}(?:\\s+${IDENTIFIER_SRC})+)(?![${WORD}_])`,
      'gu'
    );
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
  // work inside expressions too, e.g. `a = sum` or `sum * 2`. A keyword the user
  // has redefined as a variable is left alone, so the variable shadows it.
  function substituteAggregates(parsed, sum, average, variables) {
    const replace = (expression) =>
      expression.replace(AGGREGATE_WORD_ALL, (word) =>
        variables[word] !== undefined
          ? word
          : String(AGGREGATE_KEYWORDS[word.toLowerCase()] === 'average' ? average : sum)
      );

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
      } else if (
        !headerStarts.has(i) &&
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
      if (line.trim() === '' && !groups.groupOfLine.has(i)) lastBlankIndex = i;

      let parsed = parseLine(line);
      // The raw label, before mangleLines rewrote multi-word names.
      const original = parseLine(inputLines[i]);

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

      // A `unit <name> = <expression>` line registers a custom unit. The raw
      // line names it; the rewritten line carries the definition, with any other
      // custom units already rewritten to their registered names.
      const unit = unitDefinition(inputLines[i]);
      if (unit) {
        const outcome = defineUserUnit(unit.name, parseLine(lines[i]).rhs, { ...variables });
        results[i] = outcome.error
          ? { type: 'error', value: outcome.error }
          : { type: 'value', value: outcome.value, aggregate: true, unitDef: true };
        continue;
      }

      // Tags. A trailing tag (`20 #food`) labels this line, and a line that is
      // only tags (`#food`, or `sum #food`) aggregates the tagged rows above.
      // Tags used inside a calculation (`#food * 2`, `#food + #other`) are
      // substituted with their aggregate values and the line is evaluated.
      let tags = parsed.tags;
      let tagScope = null;
      if (tags.length && !parsed.valid) {
        const substituted = substituteTags(parsed, results, i, math);
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
          const value = tagAggregate(results, tags, i, mode, math);
          if (value === null) {
            results[i] = { type: 'error', value: tagError(tags) };
            continue;
          }
          results[i] = { type: 'value', value, aggregate: true };
          if (value !== undefined) previousResult = value;
          continue;
        }
      }

      if (original.isAssignment && isReservedLabel(original.label)) {
        results[i] = { type: 'error', value: `"${original.label}" is a reserved word` };
        continue;
      }

      const group = groups.groupOfLine.get(i);
      const blockStart = group ? group.start + 1 : lastBlankIndex + 1;
      const bare = parsed.code.trim();
      // A variable named like an aggregate keyword shadows it (`total = 5`).
      const keyword =
        variables[bare] === undefined ? AGGREGATE_KEYWORDS[bare.toLowerCase()] : undefined;

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
        parsedLine = substituteAggregates(parsed, blockSum, blockAvg, variables);
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

  if (typeof window !== 'undefined') {
    // The main-thread fallback registers rates through its own currency:updated
    // listener, so invalidate there too or cached conversions would go stale.
    window.addEventListener('currency:updated', () => {
      environmentRevision++;
    });
    window.addEventListener('measurement:updated', (event) => {
      if (event.detail) registerMeasurementSystem(event.detail);
    });
    window.addEventListener('total-mode:updated', (event) => {
      if (event.detail) registerTotalMode(event.detail);
    });
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
