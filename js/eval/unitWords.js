// Word forms people write for areas, volumes and number bases, rewritten into what mathjs reads:
//   `20 sq cm`, `30 square inches`, `5 m squared`, `10 m²`  ->  cm^2, inches^2, m^2
//   `30 cubic inches`, `3 ft cubed`, `2 m³`                  ->  inches^3, ft^3, m^3
//   `11 sqm`, `11 sqkm`, `11 cbm`                            ->  m^2, km^2, m^3
//   `255 in hex`, `255 to binary`, `0x9F31 as decimal`       ->  hex(255), bin(255), (0x9F31)
//   `5300 in sci`                                            ->  format(5300, {notation: "exponential"})
// A word the sheet defines as a variable is left alone.

const SQUARE = /(?<![\p{L}\p{N}_.])(?:sq|square)\.?\s+([\p{L}]+)(?![\p{L}\p{N}_])/giu;
const CUBIC = /(?<![\p{L}\p{N}_.])(?:cu|cubic)\.?\s+([\p{L}]+)(?![\p{L}\p{N}_])/giu;
const SQUARED = /(?<![\p{L}\p{N}_.])([\p{L}]+)\s+squared(?![\p{L}\p{N}_])/giu;
const CUBED = /(?<![\p{L}\p{N}_.])([\p{L}]+)\s+cubed(?![\p{L}\p{N}_])/giu;
const SQUARE_ABBREVIATION = /(?<![\p{L}\p{N}_.])sq(m|km|cm|mm|ft|in|yd|mi)(?![\p{L}\p{N}_])/giu;
const CUBIC_ABBREVIATION = /(?<![\p{L}\p{N}_.])cb(m)(?![\p{L}\p{N}_])/giu;
const SUPERSCRIPT = /([\p{L}\p{N}_)])([²³])/gu;
const BASE_CONVERSION =
  /^(.*\S)\s+(?:in|to|as)\s+(hex|hexadecimal|bin|binary|oct|octal|decimal|dec|sci|scientific)$/iu;

const BASE_FUNCTION = {
  hex: 'hex',
  hexadecimal: 'hex',
  bin: 'bin',
  binary: 'bin',
  oct: 'oct',
  octal: 'oct',
};

function preprocessUnitWords(expression, context) {
  const names = context && context.names;
  const defined = (word) => Boolean(names && names.has(word));
  const guard = (word, rewrite) => (defined(word.toLowerCase()) ? null : rewrite);

  const base = BASE_CONVERSION.exec(expression.trim());
  if (base && !defined(base[2].toLowerCase())) {
    const target = base[2].toLowerCase();
    if (BASE_FUNCTION[target]) return `${BASE_FUNCTION[target]}(${base[1]})`;
    if (target === 'decimal' || target === 'dec') return `(${base[1]})`;
    return `format(${base[1]}, {notation: "exponential"})`;
  }

  return expression
    .replace(SUPERSCRIPT, (match, left, mark) => `${left}^${mark === '²' ? 2 : 3}`)
    .replace(SQUARE_ABBREVIATION, (match, unit) =>
      defined(match.toLowerCase()) ? match : `${unit}^2`
    )
    .replace(CUBIC_ABBREVIATION, (match, unit) =>
      defined(match.toLowerCase()) ? match : `${unit}^3`
    )
    .replace(SQUARE, (match, word) => guard('sq', `${word}^2`) ?? match)
    .replace(CUBIC, (match, word) => guard('cu', `${word}^3`) ?? match)
    .replace(SQUARED, (match, word) => guard(word, `${word}^2`) ?? match)
    .replace(CUBED, (match, word) => guard(word, `${word}^3`) ?? match);
}

export { preprocessUnitWords };
