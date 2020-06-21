import results from './store/results.js';

function printResults(resultsNode) {
  resultsNode.innerHTML = '';
  results.rows.forEach(result => {
    /\d/.test(result) && resultsNode.appendChild(document.createTextNode(result));
    const addLineBreak = result === null;
    addLineBreak && resultsNode.appendChild(document.createElement('br'));
  });
}

export default printResults;