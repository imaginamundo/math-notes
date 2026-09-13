import parseLine from './parseLine.js';
import { LETTER, WORD } from './identifiers.js';

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

/**
 * Rank vocabulary entries that contain `prefix`, best first. Variables and
 * entries that start with the prefix come first; exact matches are dropped
 * because accepting them would change nothing.
 * @param {string} prefix
 * @param {Array<{ text: string, kind: string }>} entries
 * @param {number} limit
 */
function suggestionsFor(prefix, entries, limit = 8) {
  const isTag = prefix.startsWith('#');
  const lower = prefix.toLowerCase();
  const scored = [];
  for (const entry of entries) {
    // A `#` puts the popup in tag mode; otherwise only non-tag entries match.
    if ((entry.kind === 'tag') !== isTag) continue;
    if (entry.text === prefix) continue;
    const lowerText = entry.text.toLowerCase();
    const index = lowerText.indexOf(lower);
    if (index === -1) continue;
    scored.push({
      entry,
      starts: lowerText.startsWith(lower) ? 0 : 1,
      kind: KIND_ORDER[entry.kind] ?? 9,
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
  const insert = options.paren ? `${text}(` : text;
  const next = value.slice(0, range.start) + insert + value.slice(range.end);
  return { value: next, caret: range.start + insert.length };
}

// Every assigned name in the sheet (`x = 1`, `monthly rent = 1500`).
function collectAssignments(lines) {
  const names = new Set();
  for (const line of lines) {
    const { isAssignment, label } = parseLine(line);
    if (isAssignment && label) names.add(label);
  }
  return [...names];
}

// Every tag used in the sheet (`20 #food`), without the leading `#`.
function collectTags(lines) {
  const tags = new Set();
  for (const line of lines) {
    for (const tag of parseLine(line).tags) tags.add(tag);
  }
  return [...tags];
}

export { wordRangeAt, suggestionsFor, applyCompletion, collectAssignments, collectTags };
