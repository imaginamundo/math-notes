import math from './math.js';

let results = [];

function addResult(value) {
  results.push(value);
}

function total() {
  return math.evaluate(results.join(' + '));
}

function clearResults() {
  delete results.rows;
  results = [];
}

export { results, addResult, clearResults, total };