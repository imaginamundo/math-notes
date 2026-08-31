const WORD_OPERATORS = [
  [/ multiplied by /g, ' * '],
  [/ divided by /g, ' / '],
  [/ divide by /g, ' / '],
  [/ times /g, ' * '],
  [/ without /g, ' - '],
  [/ with /g, ' + '],
  [/ plus /g, ' + '],
  [/ minus /g, ' - '],
  [/ mul /g, ' * '],
];

// Note: `and` is intentionally not mapped to `+` because mathjs defines
// `and` as logical AND (e.g. `true and false`). Use `plus` or `with` for
// word-based addition.

function preprocessWordOps(expression) {
  for (const [pattern, replacement] of WORD_OPERATORS) {
    expression = expression.replace(pattern, replacement);
  }
  return expression;
}

export { preprocessWordOps };
