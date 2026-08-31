const SCALES = { k: 1e3, M: 1e6, thousand: 1e3, million: 1e6, billion: 1e9 };

// Case-sensitive on purpose: `k` is thousand and `M` is million, while `K`
// (kelvin) and `m` (meter) are units. A suffix still attached to another
// letter (e.g. `2km`) is left for mathjs.
function preprocessScales(expression) {
  return expression.replace(/(\d+(?:\.\d+)?)\s*(k|M|thousand|million|billion)(?![\w.])/g, (match, number, scale) => {
    return String(parseFloat(number) * SCALES[scale]);
  });
}

export { preprocessScales };
