import { results } from './store/results.js';

function printResults(resultsNode) {
  resultsNode.innerHTML = '';
  results.forEach(({ type, value }) => {
    if (type === 'break') {
      resultsNode.appendChild(document.createElement('br'));
      return;
    }
    if (type === 'error') {
      const span = document.createElement('span');
      span.classList.add('error');
      span.textContent = value;
      resultsNode.appendChild(span);
      return;
    }
    if (value !== undefined) {
      resultsNode.appendChild(document.createTextNode(String(value)));
    }
  });
}

export default printResults;