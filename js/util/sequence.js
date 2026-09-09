// Pure array/sequence comparisons shared by the evaluation engine (diffing the
// cached lines) and the row renderer (diffing the drawn lines).

// Index of the first differing element, or -1 when the inputs are identical.
function firstDifference(previous, next) {
  const length = Math.max(previous.length, next.length);
  for (let i = 0; i < length; i++) {
    if (previous[i] !== next[i]) return i;
  }
  return -1;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export { firstDifference, arraysEqual };
