import math from './store/math.js';
import { addResult } from './store/results.js';
import { variables, addVariable } from './store/variables.js';

function storeValues(input) {
  if (input) {
    const scope = { ...variables };
    let variable = {};
    let label;
    let value;
    let result;

    [label, ...value] = input.split('=');
    label = label.trim();
    value = value.map(value => value.trim()).join(' = ');
    
    try {
      result = input && math.evaluate(input.trim(), scope);
      value = value && math.evaluate(value);
    } catch (error) {};
    
    if (label && value) variable = { label, value };
    if (typeof(result) === 'function') result = undefined;

    addResult(result);
    addVariable(variable);
  }
}

export default storeValues;