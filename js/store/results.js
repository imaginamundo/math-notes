import math from './math.js';

let results = {
  total: 0,
  rows: []
};

function addResult(value) {
  results.rows.push(value);
}

function total() {
  return math.evaluate(results.join(' + '));
}

function clearResults() {
  delete results.rows;
  results.rows = [];
}

export { addResult, clearResults, total };
export default results;