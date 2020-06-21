import results from './store/results.js';

function printTotal(totalNode) {
  const resultsWithValues = results.rows.filter(result => Number(result) === result);

  totalNode.innerHTML = ' ';
  if (resultsWithValues.length) {
    totalNode.innerHTML = resultsWithValues.reduce((acc, cur) => acc + cur);
  }
}

export default printTotal;