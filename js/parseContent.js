import parseValues from './parseValues.js';
import formatView from './formatView.js';

let results = [];

function parseContent(childNodes) {
  const updatedResults = [];

  const nodes = [...childNodes].map(node => {
    if (node.nodeName === '#text') {
      updatedResults.push('5');
      parseValues(node.textContent);
      return formatView(node.textContent);
    }
    updatedResults.push(null);
    return document.createElement('br');
  });

  results = updatedResults;

  return nodes;
}

export { results };
export default parseContent;