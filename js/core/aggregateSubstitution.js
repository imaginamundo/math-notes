import { AGGREGATE_KEYWORDS, AGGREGATE_WORD_SOURCE } from './aggregate.js';

// A standalone aggregate keyword (`sum`, `average`, …) not followed by `(`,
// capturing the word itself so the replacement can be case-preserving.
const AGGREGATE_WORD_ALL = new RegExp(`\\b(${AGGREGATE_WORD_SOURCE})\\b(?!\\s*\\()`, 'gi');

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
      if (word in variables) return word;
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

export { substituteAggregates };
