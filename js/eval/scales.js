import { BEFORE_WORD, AFTER_WORD } from '../core/identifiers.js';

// `k` repeats as powers of a thousand: 1k = 10^3, 1kk = 10^6, 1kkk = 10^9.
// Case-sensitive on purpose: `K` is kelvin and `m` is meter, so only lowercase
// `k` is a scale. The shared boundaries keep a name like `top10k` intact while
// a suffix attached to another letter (`2km`) is left for mathjs.
const SCALE = new RegExp(`${BEFORE_WORD}(\\d+(?:\\.\\d+)?)\\s*(k+)${AFTER_WORD}`, 'gu');

function preprocessScales(expression, context) {
  const names = context && context.names;
  return expression.replace(SCALE, (match, number, scale) => {
    // A variable named `k` (or `kk`) is the user's: `3 k` is then `3 * k`.
    if (names && names.has(scale)) return match;
    return String(parseFloat(number) * 1000 ** scale.length);
  });
}

export { preprocessScales };
