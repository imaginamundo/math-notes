import { math } from './math.js';
import findVariables from './findVariables.js';

function parseValues(result) {
  // Try to get response from evaluation
  let response;
  try {
    response = result && math.evaluate(result.trim());
  } catch (error) {}

  // Search for variables
  const variable = findVariables(result);

  return [response, variable];
}

export default parseValues;