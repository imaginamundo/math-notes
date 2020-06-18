import * as mathjs from 'https://cdn.pika.dev/mathjs@^7.0.0';
import { variables } from './parseContent.js';
import findVariables from './findVariables.js';

const config = {};
const math = mathjs.create(mathjs.all, config);

function parseValues(result) {
  // Add variables before each evaluate
  math.import({
    ...variables
  }, { override: true, silent: true });

  console.log(variables);

  // Try to get response from evaluation
  let response;
  try {
    response = result && math.evaluate(result.trim());
  } catch (error) {}

  // Search for variables
  const variable = findVariables(math, result);

  // Clear variables
  const cleanVariables = {};
  Object.keys(variables).forEach(label => cleanVariables[label] = 0);
  math.import({
    ...cleanVariables
  }, { override: true, silent: true });

  return [response, variable];
}

export { math };
export default parseValues;