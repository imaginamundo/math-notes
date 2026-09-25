const WORD_OPERATORS = [
  [/ multiplied by /gi, ' * '],
  [/ divided by /gi, ' / '],
  [/ divide by /gi, ' / '],
  [/ times /gi, ' * '],
  [/ without /gi, ' - '],
  [/ with /gi, ' + '],
  [/ plus /gi, ' + '],
  [/ minus /gi, ' - '],
  [/ mul /gi, ' * '],
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
