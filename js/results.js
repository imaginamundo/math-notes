import * as mathjs from 'https://cdn.pika.dev/mathjs@^7.0.0';
import { results } from './parseContent.js';

function updateResults(resultsNode) {
  console.log(results);

  resultsNode.innerHTML = '';

  results.forEach(result => {
    const response = result && mathjs.evaluate(result.trim());

    if (response !== null) {
      return resultsNode.appendChild(document.createTextNode(response));
    } 
    return resultsNode.appendChild(document.createElement('br'));
  })
}

export default updateResults;