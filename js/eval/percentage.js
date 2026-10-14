// Translates Numi-style percentage phrasing into mathjs expressions that use
// the native % postfix operator (e.g. `30 + 5%`).

// A sign that belongs to the percentage in `-20% on 50`: a minus (or U+2212) with
// no operand before it. After an operand it is the binary minus of `10 - 20% on 50`.
const SIGN = '(?:(?<![\\w.)%]\\s*)([-−])\\s*)?';
const PCT = `${SIGN}(\\d*\\.?\\d+)`;

const signed = (sign, pct) => `${sign ? '-' : ''}${pct}`;

function preprocessPercent(expression) {
  let expr = expression;

  // A% of|on|off what is B -> value by percent part / addition / subtraction.
  // Each replacement is parenthesised, so it stays one operand of whatever
  // surrounds it (`10 - 20% on 50` is `10 - (50 + 20%)`).
  expr = expr.replace(
    new RegExp(`${PCT}\\s*%\\s+(of|on|off)\\s+what\\s+is\\s+(.+)`, 'i'),
    (match, sign, pct, word, value) => {
      const p = signed(sign, pct);
      if (word === 'of') return `((${value}) / ${p}%)`;
      if (word === 'on') return `((${value}) / (1 + ${p}%))`;
      return `((${value}) / (1 - ${p}%))`;
    }
  );

  // B as a % of|on|off A -> one value relative to another
  expr = expr.replace(/(.+)\s+as\s+a\s+%\s+(of|on|off)\s+(.+)/i, (match, value, word, base) => {
    if (word === 'of') return `((${value}) / (${base})) * 100`;
    if (word === 'on') return `((${value}) / (${base}) - 1) * 100`;
    return `(1 - (${value}) / (${base})) * 100`;
  });

  // A% of|on|off B -> percentage value / addition / subtraction
  expr = expr.replace(
    new RegExp(`${PCT}\\s*%\\s+(of|on|off)\\s+(.+)`, 'i'),
    (match, sign, pct, word, value) => {
      const p = signed(sign, pct);
      if (word === 'of') return `((${value}) * ${p}%)`;
      if (word === 'on') return `((${value}) + ${p}%)`;
      return `((${value}) - ${p}%)`;
    }
  );

  return wrapPercentChains(expr);
}

// mathjs reads `%` followed by `+` or `-` as the remainder operator, so `50 + 10% + 1`
// became `50 + (10 % (+1))` and gave 50. A percentage that is followed by a binary
// plus or minus is made unambiguous: as the right operand of an additive chain it
// closes the chain (`(50 + 10%) + 1`, which is what `50 + 10%` already means), and
// anywhere else it stands alone (`(10%) + 5`). `10 % 3`, a number right after the
// sign, is still the remainder.
const ADDITIVE = /(?:[+-]|\b(?:plus|minus|with|without))$/i;
// A percentage (a number or a name followed by `%`) that is not the remainder
// operator, which has an operand straight after it (`10 % 3`).
const CANDIDATE = /(?<![\w.])(\d*\.?\d+|[A-Za-z_]\w*)\s*%(?!\s*[\w.(])/gi;
const FOLLOWED_BY_ADDITIVE = /^\s*(?:[+-]|\b(?:plus|minus|with|without)\b)/i;
// A prefix made only of percentages that were already set apart: `(10%) + (5%) -`.
const ONLY_STANDALONE_PERCENTS =
  /^(?:\(\s*(?:\d*\.?\d+|[A-Za-z_]\w*)\s*%\s*\)\s*(?:[+-]|\b(?:plus|minus|with|without))\s*)+$/i;

// Where the operand chain around `index` begins: after the last unmatched `(` or
// `,`, or an assignment `=`, else the start of the expression.
function chainStart(text, index) {
  let depth = 0;
  for (let i = index - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === ')') depth++;
    else if (ch === '(') {
      if (depth === 0) return i + 1;
      depth--;
    } else if (depth === 0 && ch === ',') return i + 1;
    else if (
      depth === 0 &&
      ch === '=' &&
      !/[=<>!]/.test(text[i - 1] || '') &&
      text[i + 1] !== '='
    ) {
      return i + 1;
    }
  }
  return 0;
}

function wrapPercentChains(expression) {
  let out = expression;
  let from = 0;
  for (;;) {
    CANDIDATE.lastIndex = from;
    const match = CANDIDATE.exec(out);
    if (!match) return out;
    const start = match.index;
    const end = start + match[0].length;
    const begin = chainStart(out, start);
    const before = out.slice(begin, start);
    const additive = ADDITIVE.test(before.trimEnd());
    const bareChain = additive && ONLY_STANDALONE_PERCENTS.test(before.trim());
    const followed = FOLLOWED_BY_ADDITIVE.test(out.slice(end));
    // Left alone unless an additive sign follows it, or it joins a chain that began
    // with a standalone percentage (`(10%) + 5%` must add 5%, not take 5% of 10%).
    if (!followed && !bareChain) {
      from = end;
      continue;
    }
    const joined = additive && !bareChain;
    const replaceFrom = joined ? begin : start;
    const replacement = joined ? `(${before}${match[0]})` : `(${match[0]})`;
    out = out.slice(0, replaceFrom) + replacement + out.slice(end);
    from = replaceFrom + replacement.length;
  }
}

export { preprocessPercent };
