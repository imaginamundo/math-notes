import MathControl, { math } from './math.js';
import parseValues from './parseValues.js';
import formatView from './formatView.js';

let results = [];
let variables = {};

function parseContent(childNodes) {
  variables = {};

  const updatedResults = [];
  const updatedVariables = {};

  MathControl.load();
  const nodes = [...childNodes].map(node => {
    MathControl.variables(variables);

    if (node.nodeName === '#text') {
      const [ response, variable ] = parseValues(node.textContent);

      updatedResults.push(response);

      if (variable) updatedVariables[variable.label] = variable.value;
      variables = updatedVariables;

      return formatView(node.textContent);;
    }
    updatedResults.push(null);
    variables = updatedVariables;

    return document.createElement('br');
  });

  results = updatedResults;

  return nodes;
}

export { results, variables };
export default parseContent;