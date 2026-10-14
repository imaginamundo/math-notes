// Results print with thousands separators (`1,500`), and Copy result copies that text,
// so a number written that way has to be readable as input. A grouping comma is
// removed where it cannot be a separator, and where the surrounding brackets show it
// is not one.

// A number grouped in threes: 1,500  12,345,678  1,234.56
const GROUPED = /(?<![\w.,])\d{1,3}(?:,\d{3})+(?!\d|,\d)(?:\.\d+)?/g;

// The bracketed groups of an expression, each noting whether it separates its items
// with `, ` (a comma and a space). Quoted text is skipped.
function bracketGroups(text) {
  const groups = [];
  const open = [];
  let quote = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = '';
    } else if (ch === '"' || ch === "'") quote = ch;
    else if ('([{'.includes(ch)) open.push({ start: i, spaced: false });
    else if (')]}'.includes(ch) && open.length) {
      groups.push({ ...open.pop(), end: i });
    } else if (ch === ',' && text[i + 1] === ' ' && open.length) {
      open[open.length - 1].spaced = true;
    }
  }
  return groups;
}

/**
 * Remove grouping commas from numbers in an expression. Outside brackets a comma
 * between digit groups was a syntax error, so it is grouping. Inside brackets it is
 * grouping only when that bracket also separates its items with `, `
 * (`sum(1,000, 2,000)`); `max(10,200)` and `[1,234]` are two numbers, as they always
 * were.
 */
export function stripGrouping(expression) {
  if (!expression.includes(',')) return expression;
  const groups = bracketGroups(expression);
  return expression.replace(GROUPED, (token, offset) => {
    const inside = groups
      .filter((group) => group.start < offset && offset < group.end)
      .sort((a, b) => b.start - a.start)[0];
    return !inside || inside.spaced ? token.replace(/,/g, '') : token;
  });
}

/**
 * The text of a displayed result with its thousands separators removed, so what is
 * copied reads back as the same number. Items of a list are separated by a comma and
 * a space, so they are not touched.
 */
export function ungroupDisplay(text) {
  return text.replace(/(?<=\d),(?=\d{3}(?!\d))/g, '');
}
