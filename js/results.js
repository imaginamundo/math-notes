import * as mathjs from 'https://cdn.pika.dev/mathjs@^7.0.0';
import { results } from './parseContent.js';

function updateResults(resultsNode) {
  resultsNode.innerHTML = '';

  results.forEach(result => {
    const isNumber = result === 0 || result;
    isNumber && resultsNode.appendChild(document.createTextNode(result));
    const addLineBreak = result === null;
    addLineBreak && resultsNode.appendChild(document.createElement('br'));
  });
}

export default updateResults;