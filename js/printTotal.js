import { results } from './store/results.js';

function printTotal(totalNode) {
  const values = results
    .filter(({ value }) => Number(value) === value)
    .map(({ value }) => value);

  totalNode.textContent = values.length ? values.reduce((acc, cur) => acc + cur) : '';
}

export default printTotal;