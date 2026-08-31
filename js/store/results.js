let results = [];

function addResult(value, type = 'value') {
  results.push({ type, value });
}

function clearResults() {
  results = [];
}

export { results, addResult, clearResults };