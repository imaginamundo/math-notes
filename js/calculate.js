import { create, all } from './lib/math.bundle.min.js';
import parseLine from './parseLine.js';
import initCurrency from './currency.js';
import initAliases from './aliases.js';
import initCssUnits from './cssUnits.js';
import initDatetime from './datetime.js';
import preprocess from './preprocess.js';

const math = create(all);
initAliases(math);
initCssUnits(math);
initDatetime(math);

initCurrency(math, () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('currency:updated'));
  }
});

function evaluateLine(line, scope) {
  const { code, label, rhs, isAssignment } = parseLine(line);
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

const AGGREGATE_KEYWORDS = {
  sum: 'sum',
  total: 'sum',
  average: 'average',
  avg: 'average',
};

function aggregateAbove(results, fromIndex, toIndex, mode) {
  const values = results
    .slice(fromIndex, toIndex)
    .filter(({ type, value, aggregate }) => type === 'value' && !aggregate && Number(value) === value)
    .map(({ value }) => value);
  if (!values.length) return 0;
  const sum = values.reduce((acc, cur) => acc + cur);
  return mode === 'sum' ? sum : sum / values.length;
}

function evaluateLines(lines) {
  const variables = {};
  const results = [];
  let previousResult;
  let lastBlankIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') lastBlankIndex = i;

    const { code } = parseLine(line);
    const keyword = AGGREGATE_KEYWORDS[code.trim().toLowerCase()];

    if (keyword) {
      const value = aggregateAbove(results, lastBlankIndex + 1, i, keyword);
      results.push({ type: 'value', value, aggregate: true });
      if (value !== undefined) previousResult = value;
      continue;
    }

    const scope = { ...variables };
    if (previousResult !== undefined) scope.prev = previousResult;
    const { type, result, variable } = evaluateLine(line, scope);
    if (variable) variables[variable.label] = variable.value;
    results.push({ type, value: result });
    if (type !== 'error' && result !== undefined && typeof result !== 'function') {
      previousResult = result;
    }
  }

  const totalValues = results
    .filter(({ type, value, aggregate }) => type === 'value' && !aggregate && Number(value) === value)
    .map(({ value }) => value);

  return {
    results,
    total: totalValues.length ? totalValues.reduce((acc, cur) => acc + cur) : null
  };
}

export { evaluateLines, evaluateLine };
