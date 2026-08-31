import { results } from './store/results.js';

function printResults(resultsNode) {
  resultsNode.innerHTML = '';
  results.forEach(result => {
    if (result === null) {
      resultsNode.appendChild(document.createElement('br'));
      return;
    }
    if (result !== undefined) {
      resultsNode.appendChild(document.createTextNode(String(result)));
    }
  });
}

export default printResults;