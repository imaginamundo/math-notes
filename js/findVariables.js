import { math } from './math.js';

function findVariables(text = '') {
  const [label, value] = text.split(/=/);
  let evaluatedValue;

  try {
    evaluatedValue = math.evaluate(value.trim());
  } catch (error) {}

  if (label && label.includes('#')) return null;
  if (label && math.isNumber(label)) return null;
  if (evaluatedValue && !math.isNumber(evaluatedValue)) return null;
  if (!label || !value) return null;
  return {
    label: label.trim(),
    value: evaluatedValue
  };
}

export default findVariables;