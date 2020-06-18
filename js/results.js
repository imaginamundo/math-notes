import { results } from './parseContent.js';

function updateResults(resultsNode) {
  const lastHasResult = false;
  resultsNode.innerHTML = '';

  results.forEach(result => {
    const lineBreak = document.createElement('br');
    if (result) {
      resultsNode.appendChild(document.createTextNode(result));
    } else {
      resultsNode.appendChild(lineBreak);
    }
  })
}

export default updateResults;