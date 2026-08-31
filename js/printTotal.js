import { results } from './store/results.js';

function printTotal(totalNode) {
  const values = results
    .filter(({ value }) => Number(value) === value)
    .map(({ value }) => value);

  totalNode.innerHTML = ' ';
  if (values.length) {
    totalNode.innerHTML = values.reduce((acc, cur) => acc + cur);
  }
}

export default printTotal;