import { outsideStrings } from './stringMask.js';
import { AGGREGATE_KEYWORDS, AGGREGATE_WORD_SOURCE } from './aggregate.js';

// A standalone aggregate keyword (`sum`, `average`, …) not followed by `(`,
// capturing the word itself so the replacement can be case-preserving.
const AGGREGATE_WORD_ALL = new RegExp(`\\b(${AGGREGATE_WORD_SOURCE})\\b(?!\\s*\\()`, 'gi');

// `name(a, b) = body`: the parameters are the function's own names, so a parameter
// called `total` is that parameter and not the sheet's total.
const FUNCTION_DEFINITION = /(?:^|[^\w.])[A-Za-z_]\w*\s*\(([^()]*)\)\s*=(?!=)/g;

function parameterNames(code) {
  const names = new Set();
  for (const match of code.matchAll(FUNCTION_DEFINITION)) {
    for (const name of match[1].split(',')) names.add(name.trim().toLowerCase());
  }
  return names;
}

// A keyword is a field name, not an aggregate, after a `.` (`stats.total`) or as a key
// in `{ ... }` (`{total: 5}`). `code` is the line with its strings masked.
function isFieldName(code, offset, word) {
  if (/\.\s*$/.test(code.slice(0, offset)) && !/\d\s*\.\s*$/.test(code.slice(0, offset))) {
    return true;
  }
  if (!/^\s*:/.test(code.slice(offset + word.length))) return false;
  let depth = 0;
  for (let i = offset - 1; i >= 0; i--) {
    const ch = code[i];
    if (ch === ')' || ch === ']' || ch === '}') depth++;
    else if (ch === '(' || ch === '[' || ch === '{') {
      if (depth === 0) return ch === '{';
      depth--;
    }
  }
  return false;
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
    outsideStrings(expression, (code) => {
      const parameters = parameterNames(code);
      return code.replace(AGGREGATE_WORD_ALL, (word, _group, offset) => {
        if (word in variables || parameters.has(word.toLowerCase())) return word;
        if (isFieldName(code, offset, word)) return word;
        const value = AGGREGATE_KEYWORDS[word.toLowerCase()] === 'average' ? average : sum;
        const token = `__agg_${count++}`;
        values[token] = value;
        return token;
      });
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

export { substituteAggregates };
