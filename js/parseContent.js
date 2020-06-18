import MathControl, { math } from './math.js';
import parseValues from './parseValues.js';
import formatView from './formatView.js';

let results = [];
let variables = {};

function parseContent(childNodes) {
  const updatedResults = [];
  const updatedVariables = {};

  const nodes = [...childNodes].map(node => {
    MathControl.variables(variables);
   
    if (node.nodeName === '#text') {
      const [ response, variable ] = parseValues(node.textContent);

      updatedResults.push(response);

      if (variable) {
        updatedVariables[variable.label] = variable.value;
        variables = updatedVariables;
      }

      const viewNode = formatView(node.textContent);

      MathControl.load();

      return viewNode;
    }

    updatedResults.push(null);

    return document.createElement('br');
  });

  results = updatedResults;

  return nodes;
}

export { results, variables };
export default parseContent;