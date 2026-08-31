import formatResult from './formatResult.js';

function renderResults(resultsNode, results) {
  resultsNode.innerHTML = '';
  results.forEach(({ type, value }, index) => {
    if (index > 0) resultsNode.appendChild(document.createElement('br'));
    if (type === 'error') {
      const span = document.createElement('span');
      span.classList.add('error');
      span.textContent = value;
      resultsNode.appendChild(span);
      return;
    }
    if (value !== undefined) {
      resultsNode.appendChild(document.createTextNode(formatResult(value)));
    }
  });
}

export default renderResults;
