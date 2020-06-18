import parseValues from './parseValues.js';
import formatView from './formatView.js';

let results = [];
let variables = {};

function parseContent(childNodes) {
  const updatedResults = [];
  const updatedVariables = {};

  const nodes = [...childNodes].map(node => {
    if (node.nodeName === '#text') {
      const [ response, variable ] = parseValues(node.textContent);

      updatedResults.push(response);

      if (variable) updatedVariables[variable.label] = variable.value;

      return formatView(node.textContent);
    }

    updatedResults.push(null);

    return document.createElement('br');
  });

  results = updatedResults;
  variables = updatedVariables;

  return nodes;
}

export { results, variables };
export default parseContent;