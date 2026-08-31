const WORD_OPERATORS = [
  [/ multiplied by /g, ' * '],
  [/ divided by /g, ' / '],
  [/ divide by /g, ' / '],
  [/ times /g, ' * '],
  [/ without /g, ' - '],
  [/ with /g, ' + '],
  [/ plus /g, ' + '],
  [/ minus /g, ' - '],
  [/ and /g, ' + '],
  [/ mul /g, ' * '],
];

function preprocessWordOps(expression) {
  for (const [pattern, replacement] of WORD_OPERATORS) {
    expression = expression.replace(pattern, replacement);
  }
  return expression;
}

export { preprocessWordOps };
