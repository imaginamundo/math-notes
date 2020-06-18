import { results } from './parseContent.js';

function updateResults(resultsNode) {
  console.log(results);

  resultsNode.innerHTML = '';

  results.forEach(result => {
    if (result) {
      return resultsNode.appendChild(document.createTextNode(result));
    } 
    return resultsNode.appendChild(document.createElement('br'));
  })
}

export default updateResults;