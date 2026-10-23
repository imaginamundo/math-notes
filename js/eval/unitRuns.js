import { BEFORE_WORD, AFTER_WORD } from '../core/identifiers.js';

// A measurement written in two units of one dimension, with no operator between
// them, is their sum: `6 ft 2 in`, `1 m 80 cm`, `1 lb 4 oz`. mathjs reads the gap as
// multiplication, so `6 ft 2 in` was 144 in^2 and the total bar added up areas.
// Time runs (`1 h 30 min`) already work this way (see timespan.js); this covers
// length, mass and volume.
//
//   6 ft 2 in         -> ((6 ft + 2 inch) to inch)
//   5 ft 10 in to cm  -> ((5 ft + 10 inch) to inch) to cm
//
// The run is expressed in the smallest unit it names, so nothing is lost to the unit
// that happened to come first, and wrapped so it is one operand. Units of different
// dimensions (`3 m 4 s`) or the same unit twice (`2 m 3 m`) are left alone.

// [mathjs name, size in the dimension's base unit, accepted spellings]
const DIMENSIONS = {
  length: [
    ['mm', 0.001, ['mm', 'millimeter', 'millimeters', 'millimetre', 'millimetres']],
    ['cm', 0.01, ['cm', 'centimeter', 'centimeters', 'centimetre', 'centimetres']],
    ['m', 1, ['m', 'meter', 'meters', 'metre', 'metres']],
    ['km', 1000, ['km', 'kilometer', 'kilometers', 'kilometre', 'kilometres']],
    ['inch', 0.0254, ['in', 'inch', 'inches']],
    ['ft', 0.3048, ['ft', 'foot', 'feet']],
    ['yd', 0.9144, ['yd', 'yard', 'yards']],
    ['mi', 1609.344, ['mi', 'mile', 'miles']],
  ],
  mass: [
    ['mg', 0.000001, ['mg', 'milligram', 'milligrams']],
    ['g', 0.001, ['g', 'gram', 'grams']],
    ['kg', 1, ['kg', 'kilogram', 'kilograms']],
    ['oz', 0.028349523, ['oz', 'ounce', 'ounces']],
    ['lb', 0.45359237, ['lb', 'lbs', 'pound', 'pounds']],
  ],
  // Only the metric volumes: cups, pints and gallons change with the measurement
  // system, so there is no fixed smallest.
  volume: [
    ['ml', 0.001, ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres']],
    ['l', 1, ['l', 'liter', 'liters', 'litre', 'litres']],
  ],
};

const BY_SPELLING = new Map();
for (const [dimension, units] of Object.entries(DIMENSIONS)) {
  for (const [name, size, spellings] of units) {
    for (const spelling of spellings) BY_SPELLING.set(spelling, { dimension, name, size });
  }
}

const ALTERNATIVES = [...BY_SPELLING.keys()].sort((a, b) => b.length - a.length).join('|');
const COMPONENT = `${BEFORE_WORD}\\d+(?:\\.\\d+)?\\s*(?:${ALTERNATIVES})${AFTER_WORD}`;
const RUN = new RegExp(`${COMPONENT}(?:\\s+${COMPONENT})+`, 'gi');
const PART = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${ALTERNATIVES})${AFTER_WORD}`, 'gi');

function preprocessUnitRuns(expression) {
  return expression.replace(RUN, (run) => {
    const parts = [];
    for (const [, amount, spelling] of run.matchAll(PART)) {
      parts.push({ amount, ...BY_SPELLING.get(spelling.toLowerCase()) });
    }
    const names = new Set(parts.map((part) => part.name));
    const sameDimension = parts.every((part) => part.dimension === parts[0].dimension);
    if (!sameDimension || names.size < 2) return run;
    const smallest = parts.reduce((best, part) => (part.size < best.size ? part : best));
    const sum = parts.map((part) => `${part.amount} ${part.name}`).join(' + ');
    return `((${sum}) to ${smallest.name})`;
  });
}

export { preprocessUnitRuns };
