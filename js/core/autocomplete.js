import parseLine from './parseLine.js';

// Pure completion logic: find the word under the caret, rank vocabulary
// matches, and apply a chosen completion. No DOM, so it is unit-tested
// directly; the popup in js/ui/autocomplete.js only draws and drives it.

// A word starts with a letter (or underscore/µ) and continues with letters,
// digits, underscore or µ. Leading digits keep `300g` a word for `g` without
// swallowing the number.
const HEAD = /[A-Za-z_µ]/;
const TAIL = /[A-Za-z0-9_µ]/;

const KIND_ORDER = { variable: 0, keyword: 1, function: 2, constant: 3, unit: 4 };

/**
 * The word around the caret, with the part before the caret as `prefix`.
 * Returns null when the caret is not inside a completable word.
 * @param {string} value
 * @param {number} caret
 * @returns {{ start: number, end: number, text: string, prefix: string }|null}
 */
function wordRangeAt(value, caret) {
  if (typeof caret !== 'number' || caret < 0 || caret > value.length) return null;
  let start = caret;
  while (start > 0 && TAIL.test(value[start - 1])) start--;
  while (start < caret && !HEAD.test(value[start])) start++;
  let end = caret;
  while (end < value.length && TAIL.test(value[end])) end++;
  if (start >= end || !HEAD.test(value[start])) return null;
  return { start, end, text: value.slice(start, end), prefix: value.slice(start, caret) };
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
  const lower = prefix.toLowerCase();
  const scored = [];
  for (const entry of entries) {
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

export { wordRangeAt, suggestionsFor, applyCompletion, collectAssignments };
