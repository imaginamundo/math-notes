import * as mathjs from 'https://cdn.pika.dev/mathjs@^7.0.0';
import { variables } from './parseContent.js';
import findVariables from './findVariables.js';

const config = {};
const math = mathjs.create(mathjs.all, config);

function parseValues(result) {
  // Add variables before each evaluate
  math.import({
    ...variables
  });

  // Try to get response from evaluation
  let response;
  try {
    const containNumber = /\d/.test(result);
    response = containNumber && result && math.evaluate(result.trim());
  } catch (error) {}

  // Search for variables
  const variable = findVariables();

  return [response, variable];
}

export default parseValues;