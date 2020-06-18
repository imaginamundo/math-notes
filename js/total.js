import { results } from './parseContent.js';

function updateTotal(totalNode) {
  const resultsWithValues = results.filter(result => Number(result) === result);

  totalNode.innerHTML = ' ';
  if (resultsWithValues.length) {
    totalNode.innerHTML = resultsWithValues.reduce((acc, cur) => acc + cur);
  }
}

export default updateTotal;