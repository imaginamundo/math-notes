const AGGREGATE_KEYWORDS = {
  sum: 'sum',
  total: 'sum',
  average: 'average',
  avg: 'average',
};

function aggregateAbove(results, fromIndex, toIndex, mode) {
  const values = results
    .slice(fromIndex, toIndex)
    .filter(
      ({ type, value, aggregate }) => type === 'value' && !aggregate && Number(value) === value
    )
    .map(({ value }) => value);
  if (!values.length) return 0;
  const sum = values.reduce((acc, cur) => acc + cur);
  return mode === 'sum' ? sum : sum / values.length;
}

function computeTotal(results) {
  const totalValues = results
    .filter(
      ({ type, value, aggregate }) => type === 'value' && !aggregate && Number(value) === value
    )
    .map(({ value }) => value);
  return totalValues.length ? totalValues.reduce((acc, cur) => acc + cur) : null;
}

export { AGGREGATE_KEYWORDS, aggregateAbove, computeTotal };
