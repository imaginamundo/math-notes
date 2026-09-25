import { BEFORE_WORD, AFTER_WORD } from '../core/identifiers.js';

// `k` repeats as powers of a thousand: 1k = 10^3, 1kk = 10^6, 1kkk = 10^9.
// Case-sensitive on purpose: `K` is kelvin and `m` is meter, so only lowercase
// `k` is a scale. The shared boundaries keep a name like `top10k` intact while
// a suffix attached to another letter (`2km`) is left for mathjs.
const SCALE = new RegExp(`${BEFORE_WORD}(\\d+(?:\\.\\d+)?)\\s*(k+)${AFTER_WORD}`, 'gu');

function preprocessScales(expression) {
  return expression.replace(SCALE, (match, number, scale) => {
    return String(parseFloat(number) * 1000 ** scale.length);
  });
}

export { preprocessScales };
