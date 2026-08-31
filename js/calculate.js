import { create, all } from './lib/math.bundle.min.js';
import parseLine from './parseLine.js';
import initCurrency, { preprocessSymbols } from './currency.js';

const math = create(all);

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
    result = math.evaluate(preprocessSymbols(code), scope);
    value = rhs && math.evaluate(preprocessSymbols(rhs), scope);
  } catch (error) {
    result = error;
    value = undefined;
    type = 'error';
  }

  if (typeof result === 'function') result = undefined;

  const variable = isAssignment && value !== undefined ? { label, value } : null;

  return { type, result: result instanceof Error ? result.message : result, variable };
}

function evaluateLines(lines) {
  const variables = {};
  const results = [];
  let previousResult;

  for (const line of lines) {
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
    .filter(({ type, value }) => type === 'value' && Number(value) === value)
    .map(({ value }) => value);

  return {
    results,
    total: totalValues.length ? totalValues.reduce((acc, cur) => acc + cur) : null
  };
}

export { evaluateLines, evaluateLine };
