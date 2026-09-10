// `k` repeats as powers of a thousand: 1k = 10^3, 1kk = 10^6, 1kkk = 10^9.
// Case-sensitive on purpose: `K` is kelvin and `m` is meter, so only lowercase
// `k` is a scale. A suffix attached to another letter (e.g. `2km`) is left for
// mathjs.
function preprocessScales(expression) {
  return expression.replace(/(\d+(?:\.\d+)?)\s*(k+)(?![\w.])/g, (match, number, scale) => {
    return String(parseFloat(number) * 1000 ** scale.length);
  });
}

export { preprocessScales };
