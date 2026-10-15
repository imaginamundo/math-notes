import parseLine from './parseLine.js';
import { LETTER, WORD } from './identifiers.js';
import { unitDefinition, unitAliases } from './userUnits.js';
import { isReservedLabel } from './reservedWords.js';

// Pure completion logic: find the word under the caret, rank vocabulary
// matches, and apply a chosen completion. No DOM, so it is unit-tested
// directly; the popup in js/ui/autocomplete.js only draws and drives it.

// A word starts with a letter (or underscore/µ) and continues with letters,
// digits, underscore or µ. Leading digits keep `300g` a word for `g` without
// swallowing the number. A tag is `#` followed by tag characters (so `-` is
// allowed inside a tag, unlike a plain word). Unicode-aware, so `açai` completes
// as one word.
const HEAD = new RegExp(`[${LETTER}_µ]`, 'u');
const TAIL = new RegExp(`[${WORD}_µ]`, 'u');
const TAG_TAIL = new RegExp(`[${WORD}_-]`, 'u');

const KIND_ORDER = { variable: 0, tag: 1, keyword: 2, function: 3, constant: 4, unit: 5 };

/**
 * The word around the caret, with the part before the caret as `prefix`.
 * Returns null when the caret is not inside a completable word. A `#tag` comes
 * back with `tag: true` and its range including the `#`.
 * @param {string} value
 * @param {number} caret
 * @returns {{ start: number, end: number, text: string, prefix: string, tag: boolean }|null}
 */
function wordRangeAt(value, caret) {
  if (typeof caret !== 'number' || caret < 0 || caret > value.length) return null;

  let tagStart = caret;
  while (tagStart > 0 && TAG_TAIL.test(value[tagStart - 1])) tagStart--;
  if (value[tagStart - 1] === '#') {
    const start = tagStart - 1;
    let end = caret;
    while (end < value.length && TAG_TAIL.test(value[end])) end++;
    return {
      start,
      end,
      text: value.slice(start, end),
      prefix: value.slice(start, caret),
      tag: true,
    };
  }

  let start = caret;
  while (start > 0 && TAIL.test(value[start - 1])) start--;
  while (start < caret && !HEAD.test(value[start])) start++;
  let end = caret;
  while (end < value.length && TAIL.test(value[end])) end++;
  if (start >= end || !HEAD.test(value[start])) return null;
  return {
    start,
    end,
    text: value.slice(start, end),
    prefix: value.slice(start, caret),
    tag: false,
  };
}

// Where a multi-word name (`monthly rent`) starts when the caret is on one of its later
// words: the words of the name already typed before the caret belong to the replacement,
// or the name would appear twice (`monthly monthly rent`). Returns an index into `value`.
function nameStart(value, start, name) {
  const words = name.split(/\s+/);
  for (let count = words.length - 1; count >= 1; count--) {
    const lead = new RegExp(
      `(?<![${WORD}_])${words
        .slice(0, count)
        .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('\\s+')}\\s+$`,
      'iu'
    );
    const match = lead.exec(value.slice(0, start));
    if (match) return match.index;
  }
  return start;
}

// A number or `to`/`in`/`as` before the word means a unit is being written.
const UNIT_POSITION = /(?:\d|%|(?<![\p{L}\p{N}_])(?:to|in|as))[ \t]*$/iu;

/**
 * Rank vocabulary entries that contain `prefix`, best first. Variables and
 * entries that start with the prefix come first; an entry that is already fully typed
 * (including the earlier words of a multi-word name) is dropped because accepting it
 * would change nothing. After a number or `to`/`in`/`as`, only units (and names) are
 * offered, units first: nobody types a function there.
 * @param {string} prefix
 * @param {Array<{ text: string, kind: string }>} entries
 * @param {number} limit
 * @param {{ before?: string }} [options] the text before the word, for context
 */
function suggestionsFor(prefix, entries, limit = 8, options = {}) {
  const before = options.before ?? '';
  const isTag = prefix.startsWith('#');
  const unitPosition = !isTag && UNIT_POSITION.test(before);
  const order = unitPosition ? { unit: 0, variable: 1 } : KIND_ORDER;
  const lower = prefix.toLowerCase();
  const scored = [];
  for (const entry of entries) {
    // A `#` puts the popup in tag mode; otherwise only non-tag entries match.
    if ((entry.kind === 'tag') !== isTag) continue;
    if (unitPosition && !(entry.kind in order)) continue;
    if (entry.text === prefix) continue;
    const lowerText = entry.text.toLowerCase();
    const index = lowerText.indexOf(lower);
    if (index === -1) continue;
    if (/\s/.test(entry.text)) {
      const typed = (before + prefix).slice(nameStart(before + prefix, before.length, entry.text));
      if (typed.replace(/\s+/g, ' ').toLowerCase() === lowerText) continue;
    }
    scored.push({
      entry,
      starts: lowerText.startsWith(lower) ? 0 : 1,
      kind: order[entry.kind] ?? 9,
      index,
    });
  }
  scored.sort(
    (a, b) =>
      a.starts - b.starts ||
      a.kind - b.kind ||
      a.index - b.index ||
      a.entry.text.length - b.entry.text.length ||
      a.entry.text.localeCompare(b.entry.text)
  );
  return scored.slice(0, limit).map((item) => item.entry);
}

/**
 * Replace a word range with a completion. `paren` appends an opening bracket
 * for functions and puts the caret after it.
 * @param {string} value
 * @param {{ start: number, end: number }} range
 * @param {string} text
 * @param {{ paren?: boolean }} [options]
 * @returns {{ value: string, caret: number }}
 */
function applyCompletion(value, range, text, options = {}) {
  // A function already followed by its bracket (`sqr(16)`) does not get a second one.
  const bracketed = /^\s*\(/.test(value.slice(range.end));
  const insert = options.paren && !bracketed ? `${text}(` : text;
  const start = /\s/.test(text) ? nameStart(value, range.start, text) : range.start;
  const next = value.slice(0, start) + insert + value.slice(range.end);
  return { value: next, caret: start + insert.length };
}

// One line's contribution to the suggestion list: the name it assigns (a unit
// definition names a unit, so it is not offered as a variable), its unit
// definition, and its tags. Parsed once, so a caller that keeps these per line
// re-parses only the lines an edit actually touched.
// A name the popup may offer: a plain identifier or several words, never a reserved
// word, a call (`cube(x)`), an index (`n[2]`), a path or a comment.
const NAME = new RegExp(`^[${LETTER}_][${WORD}_]*(?: [${WORD}_]+)*$`, 'u');
const FUNCTION_HEAD = new RegExp(`^\\s*([${LETTER}_][${WORD}_]*)\\s*\\([^()]*\\)\\s*=(?!=)`, 'u');
const CALL_LABEL = new RegExp(`^([${LETTER}_][${WORD}_]*)\\s*\\([^()]*\\)$`, 'u');

function usableName(label) {
  return NAME.test(label) && !isReservedLabel(label) && label.toLowerCase() !== 'end';
}

function suggestionFacts(line) {
  const parsed = typeof line === 'string' ? parseLine(line) : line;
  const unit = unitDefinition(parsed);
  let variable = null;
  let fn = null;
  if (!unit && parsed.isAssignment && parsed.label) {
    const call = CALL_LABEL.exec(parsed.label);
    if (call && usableName(call[1]))
      fn = call[1]; // `f(x) = …`
    else if (usableName(parsed.label)) {
      if (FUNCTION_HEAD.test(parsed.rhs || ''))
        fn = parsed.label; // `sq = f(x) = …`
      else variable = parsed.label;
    }
  }
  return {
    variable,
    fn,
    unit: unit ? { name: unit.name, aliases: unitAliases(unit.name) } : null,
    tags: parsed.tags,
  };
}

// The popup's own list from those facts, in the order it shows them:
// variables, custom units (first definition of a name wins, as in
// `collectUnitDefinitions`), tags. The curated vocabulary is the caller's to
// append.
function suggestionsFrom(facts) {
  const variables = new Set();
  const functions = new Set();
  const units = new Map();
  const tags = new Set();
  for (const fact of facts) {
    if (fact.variable) variables.add(fact.variable);
    if (fact.fn) functions.add(fact.fn);
    if (fact.unit) {
      const key = fact.unit.name.toLowerCase();
      if (!units.has(key)) units.set(key, fact.unit);
    }
    for (const tag of fact.tags) tags.add(tag);
  }
  return [
    ...[...variables].map((text) => ({ text, kind: 'variable' })),
    ...[...functions].map((text) => ({ text, kind: 'function', detail: 'your function' })),
    ...[...units.values()].flatMap(({ name, aliases }) =>
      [name, ...aliases].map((text) => ({ text, kind: 'unit', detail: 'custom unit' }))
    ),
    ...[...tags].map((text) => ({ text: `#${text}`, kind: 'tag' })),
  ];
}

export { wordRangeAt, suggestionsFor, applyCompletion, suggestionFacts, suggestionsFrom };
