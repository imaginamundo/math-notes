// Translates Numi-style percentage phrasing into mathjs expressions that use
// the native % postfix operator (e.g. `30 + 5%`).

// A sign that belongs to the percentage in `-20% on 50`: a minus (or U+2212) with
// no operand before it. After an operand it is the binary minus of `10 - 20% on 50`.
const SIGN = '(?:(?<![\\w.)%]\\s*)([-−])\\s*)?';

const signed = (sign, pct) => `${sign ? '-' : ''}${pct}`;

function preprocessPercent(expression) {
  let expr = expression;

  // B as a % of|on|off A -> one value relative to another
  expr = expr.replace(/(.+)\s+as\s+a\s+%\s+(of|on|off)\s+(.+)/i, (match, value, word, base) => {
    if (word === 'of') return `((${value}) / (${base})) * 100`;
    if (word === 'on') return `((${value}) / (${base}) - 1) * 100`;
    return `(1 - (${value}) / (${base})) * 100`;
  });

  return wrapPercentChains(applyPhrases(expr));
}

// `A% of|on|off B` and `A% of|on|off what is B`: the percentage is a number or a name.
const HEAD = new RegExp(
  `${SIGN}(\\d*\\.?\\d+|[A-Za-z_]\\w*)\\s*%\\s+(of|on|off)\\s+(?:(what)\\s+is\\s+)?`,
  'gi'
);
const PHRASE_START = new RegExp(
  `^${SIGN}(?:\\d*\\.?\\d+|[A-Za-z_]\\w*)\\s*%\\s+(?:of|on|off)\\b`,
  'i'
);
// A conversion or rounding clause at the end of an operand (`in EUR`, `to 2 dp`,
// `to nearest 5`, `rounded`) belongs to the whole result, not to the operand.
const TRAILING_CLAUSE = /\s+(?:(?:to|in|as)\s+[^+\-*/()]+|rounded\b.*)$/i;

// Where the operand of a phrase ends: the end of the line, but not past an unbalanced
// closing bracket, a comma, or the operator in front of another percent phrase
// (`10% of 50 + 10% of 20` is two phrases), and before a trailing conversion or
// rounding clause. A phrase still takes the rest of the line otherwise, so
// `10% of 50 + 5` is 5.5.
function operandEnd(text, from) {
  let depth = 0;
  let end = text.length;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') {
      if (depth === 0) {
        end = i;
        break;
      }
      depth--;
    } else if (depth === 0 && ch === ',') {
      end = i;
      break;
    } else if (
      depth === 0 &&
      '+-*/'.includes(ch) &&
      PHRASE_START.test(text.slice(i + 1).trimStart())
    ) {
      end = i;
      break;
    }
  }
  const tail = TRAILING_CLAUSE.exec(text.slice(from, end));
  return tail ? end - tail[0].length : end;
}

function applyPhrases(expression) {
  let out = expression;
  let from = 0;
  for (;;) {
    HEAD.lastIndex = from;
    const match = HEAD.exec(out);
    if (!match) return out;
    const [head, sign, pct, word, what] = match;
    const start = match.index;
    const operandStart = start + head.length;
    const end = operandEnd(out, operandStart);
    const operand = out.slice(operandStart, end).trim();
    if (!operand) {
      from = operandStart;
      continue;
    }
    // Phrases inside the operand (in brackets, say) are applied first, since the scan
    // above does not look inside them.
    const value = applyPhrases(operand);
    const p = signed(sign, pct);
    const kind = word.toLowerCase();
    let replacement;
    if (what) {
      if (kind === 'of') replacement = `((${value}) / ${p}%)`;
      else replacement = `((${value}) / (1 ${kind === 'on' ? '+' : '-'} ${p}%))`;
    } else if (kind === 'of') replacement = `((${value}) * ${p}%)`;
    else replacement = `((${value}) ${kind === 'on' ? '+' : '-'} ${p}%)`;
    out = out.slice(0, start) + replacement + out.slice(end);
    from = start + replacement.length;
  }
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
