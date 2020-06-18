import * as mathjs from 'https://cdn.pika.dev/mathjs@^7.0.0';
import { results } from './parseContent.js';

function updateResults(resultsNode) {
  resultsNode.innerHTML = '';

  console.log(results);

  results.forEach(result => {
    let response = null;
    try {
      const containNumber = /\d/.test(result);
      response = containNumber && result && mathjs.evaluate(result.trim());
    } catch (error) {}

    response && resultsNode.appendChild(document.createTextNode(response));

    const addLineBreak = result === null;
    addLineBreak && resultsNode.appendChild(document.createElement('br'));
  });
}

export default updateResults;