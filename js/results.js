import { results } from './parseContent.js';
import { math } from './parseValues.js';

function updateResults(resultsNode) {
  resultsNode.innerHTML = '';

  results.forEach(result => {
    math.isNumber(result) && resultsNode.appendChild(document.createTextNode(result));
    const addLineBreak = result === null;
    addLineBreak && resultsNode.appendChild(document.createElement('br'));
  });
}

export default updateResults;