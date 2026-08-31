import { create, all } from '../lib/math.bundle.min.js';
import parseLine from './parseLine.js';
import initCurrency from '../eval/currency.js';
import initAliases from '../eval/aliases.js';
import initCssUnits from '../eval/cssUnits.js';
import initDatetime from '../eval/datetime.js';
import preprocess from './preprocess.js';
import { AGGREGATE_KEYWORDS, aggregateAbove, computeTotal } from './aggregate.js';

const math = create(all);
initAliases(math);
initCssUnits(math);
initDatetime(math);

initCurrency(math);

function evaluateLine(line, scope) {
  const parsed = typeof line === 'string' ? parseLine(line) : line;
  const { code, label, rhs, isAssignment } = parsed;
  let type = isAssignment ? 'assignment' : 'value';
  let value;
  let result;

  try {
    result = math.evaluate(preprocess(code), scope);
    value = rhs && math.evaluate(preprocess(rhs), scope);
  } catch (error) {
    result = error;
    value = undefined;
    type = 'error';
  }

  if (typeof result === 'function') result = undefined;

  const variable = isAssignment && value !== undefined ? { label, value } : null;

  return { type, result: result instanceof Error ? result.message : result, variable };
}

// Matches a standalone aggregate keyword, i.e. not a mathjs function call
// like `sum([1, 2, 3])`.
const AGGREGATE_WORD = /\b(?:sum|total|average|avg)\b(?!\s*\()/;
const AGGREGATE_SUM_WORD = /\b(?:sum|total)\b(?!\s*\()/g;
const AGGREGATE_AVG_WORD = /\b(?:average|avg)\b(?!\s*\()/g;

// Replace aggregate keywords in an expression with the block's values so they
// work inside expressions too, e.g. `a = sum` or `sum * 2`.
function substituteAggregates(parsed, sum, average) {
  const replace = (expression) =>
    expression
      .replace(AGGREGATE_SUM_WORD, String(sum))
      .replace(AGGREGATE_AVG_WORD, String(average));

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

function evaluateLines(lines) {
  const variables = {};
  const results = [];
  let previousResult;
  let lastBlankIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') lastBlankIndex = i;

    const parsed = parseLine(line);

    if (parsed.isAssignment && AGGREGATE_KEYWORDS[parsed.label.toLowerCase()]) {
      results.push({ type: 'error', value: `"${parsed.label}" is a reserved word` });
      continue;
    }

    const keyword = AGGREGATE_KEYWORDS[parsed.code.trim().toLowerCase()];

    if (keyword) {
      const value = aggregateAbove(results, lastBlankIndex + 1, i, keyword);
      results.push({ type: 'value', value, aggregate: true });
      if (value !== undefined) previousResult = value;
      continue;
    }

    const scope = { ...variables };
    if (previousResult !== undefined) scope.prev = previousResult;

    let parsedLine = parsed;
    if (AGGREGATE_WORD.test(parsed.code)) {
      const blockSum = aggregateAbove(results, lastBlankIndex + 1, i, 'sum');
      const blockAvg = aggregateAbove(results, lastBlankIndex + 1, i, 'average');
      parsedLine = substituteAggregates(parsed, blockSum, blockAvg);
    }

    const { type, result, variable } = evaluateLine(parsedLine, scope);
    if (variable) variables[variable.label] = variable.value;
    results.push({ type, value: result });
    if (type !== 'error' && result !== undefined && typeof result !== 'function') {
      previousResult = result;
    }
  }

  return {
    results,
    total: computeTotal(results),
  };
}

export { evaluateLines, evaluateLine };
