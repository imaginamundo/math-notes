import { create, all } from './lib/math.bundle.min.js';
import parseLine from './parseLine.js';

const math = create(all);

function evaluateLine(line, scope) {
  const { code, label, rhs, isAssignment } = parseLine(line);
  let type = isAssignment ? 'assignment' : 'value';
  let value;
  let result;

  try {
    result = math.evaluate(code, scope);
    value = rhs && math.evaluate(rhs, scope);
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

  for (const line of lines) {
    const scope = { ...variables };
    const { type, result, variable } = evaluateLine(line, scope);
    if (variable) variables[variable.label] = variable.value;
    results.push({ type, value: result });
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
