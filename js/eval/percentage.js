// Translates Numi-style percentage phrasing into mathjs expressions that use
// the native % postfix operator (e.g. `30 + 5%`).
function preprocessPercent(expression) {
  let expr = expression;

  // A% of|on|off what is B -> value by percent part / addition / subtraction
  expr = expr.replace(/(\d+(?:\.\d+)?)\s*%\s+(of|on|off)\s+what\s+is\s+(.+)/i, (match, pct, word, value) => {
    if (word === 'of') return `${value} / ${pct}%`;
    if (word === 'on') return `${value} / (1 + ${pct}%)`;
    return `${value} / (1 - ${pct}%)`;
  });

  // B as a % of|on|off A -> one value relative to another
  expr = expr.replace(/(.+)\s+as\s+a\s+%\s+(of|on|off)\s+(.+)/i, (match, value, word, base) => {
    if (word === 'of') return `(${value} / ${base}) * 100`;
    if (word === 'on') return `(${value} / ${base} - 1) * 100`;
    return `(1 - ${value} / ${base}) * 100`;
  });

  // A% of|on|off B -> percentage value / addition / subtraction
  expr = expr.replace(/(\d+(?:\.\d+)?)\s*%\s+(of|on|off)\s+(.+)/i, (match, pct, word, value) => {
    if (word === 'of') return `${value} * ${pct}%`;
    if (word === 'on') return `${value} + ${pct}%`;
    return `${value} - ${pct}%`;
  });

  return expr;
}

export { preprocessPercent };
