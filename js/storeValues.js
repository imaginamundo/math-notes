import math from './store/math.js';
import { addResult } from './store/results.js';
import { variables, addVariable } from './store/variables.js';

function storeValues(input) {
  if (input) {
    const scope = { ...variables };
    let label;
    let value;
    let result;

    [label, ...value] = input.split('=');
    label = label.trim();
    value = value.map(part => part.trim()).join(' = ');

    const isAssignment = !!(label && value);
    let type = isAssignment ? 'assignment' : 'value';

    try {
      result = math.evaluate(input.trim(), scope);
      value = value && math.evaluate(value, scope);
    } catch (error) {
      result = error;
      value = undefined;
      type = 'error';
    }

    if (typeof(result) === 'function') result = undefined;

    if (isAssignment && value !== undefined) addVariable({ label, value });
    addResult(result instanceof Error ? result.message : result, type);
  }
}

export default storeValues;