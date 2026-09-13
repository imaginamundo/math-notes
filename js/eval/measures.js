import {
  isUnit,
  trailingDimension,
  DEFAULT_FACTORS,
  DEFAULT_DENSITY,
  VOLUME_UNITS,
  DEFAULT_MEASUREMENT_SYSTEM,
} from '../core/measures.js';
import { LETTER, WORD } from '../core/identifiers.js';

// Generic subject labels: `300g butter in cups`, `300g in cups`, or even
// `300g feathers in cups`. The subject is free-form — no dataset required. A
// known subject (DEFAULT_FACTORS) supplies a specific factor; any other label
// is informational and falls back to DEFAULT_DENSITY. mathjs does the unit
// algebra via the `__measure` helper below.

const CONVERSION = /^(.*\S)\s+(?:in|to)\s+(\S.*)$/i;
const TRAILING_UNIT = /([A-Za-zµ][A-Za-zµ]*)\s*$/;
const HAS_LETTER = /[A-Za-zµ]/;

function preprocessMeasures(expression) {
  // mathjs reads `fl oz` as femtolitre × ounce; normalise it to the real unit.
  const normalized = expression.replace(/\bfl\.?\s*oz\.?(?=\s|$)/gi, 'floz');
  const match = CONVERSION.exec(normalized);
  if (!match) return normalized;

  const [, left, target] = match;
  const split = splitSubject(left);
  if (!split) return normalized;
  const { value, subject } = split;

  // The target must be a bare unit, or this is some other `to` phrase (a
  // quantity like `25 min` for pace, or rounding's `to nearest 5`).
  if (!/^[A-Za-zµ]/.test(target)) return normalized;
  const targetDimension = trailingDimension(target);
  if (!targetDimension) return normalized;

  // With no label, only take over when the two dimensions differ, so ordinary
  // unit conversions (`1 cm to m`, `10 km to m`) stay with mathjs.
  if (!subject) {
    const valueDimension = trailingDimension(value);
    if (!valueDimension || valueDimension === targetDimension) return normalized;
  }

  // Resolve the factor here, before later preprocessors run: embedding the
  // subject name in the expression would let `scales` rewrite it (`4k video`).
  const factorText = DEFAULT_FACTORS[subject.toLowerCase()] || DEFAULT_DENSITY;
  return `__measure((${value}), (${factorText}), (${target}))`;
}

// Split `<value> <subject>` where the value ends in a unit and the subject is
// the free-form label after it (`olive oil`). The subject may be empty, but it
// must be made of label words: `21.1 km * prev` has no subject (`*` is not a
// label), so it stays a plain calculation for mathjs.
function splitSubject(left) {
  const words = left.trim().split(/\s+/);
  let unitIndex = -1;
  for (let i = words.length - 1; i >= 0; i--) {
    if (endsWithUnit(words[i])) {
      unitIndex = i;
      break;
    }
  }
  if (unitIndex === -1) return null;

  const subjectWords = words.slice(unitIndex + 1);
  if (!subjectWords.every(isLabelWord)) return null;
  if (subjectWords[0] && subjectWords[0].toLowerCase() === 'of') subjectWords.shift();
  return {
    value: words.slice(0, unitIndex + 1).join(' '),
    subject: subjectWords.join(' '),
  };
}

// A free-form subject word (`butter`, `olive`, `4k`, `açúcar`): at least one
// letter, no operators, and not itself a unit.
const LABEL_WORD = new RegExp(`^[${WORD}_-]*[${LETTER}][${WORD}_-]*$`, 'u');

function isLabelWord(word) {
  return LABEL_WORD.test(word) && !isUnit(word);
}

function endsWithUnit(word) {
  if (!HAS_LETTER.test(word)) return false;
  const match = TRAILING_UNIT.exec(word);
  return Boolean(match && isUnit(match[1]));
}

// Try the value against the target directly (same dimension), then against the
// factor both ways, so a factor written either orientation works.
function measure(math, value, factor, target) {
  const toTarget = (candidate) =>
    candidate && candidate.isUnit === true ? candidate.to(target) : candidate;

  try {
    return toTarget(value);
  } catch {
    // needs a factor
  }

  if (factor && factor.isUnit === true) {
    try {
      return toTarget(math.multiply(value, factor));
    } catch {
      // wrong orientation
    }
    try {
      return toTarget(math.divide(value, factor));
    } catch {
      // wrong orientation
    }
  }

  throw new Error(`Cannot convert ${value} to ${target}`);
}

function applyMeasurementSystem(math, system) {
  const units = VOLUME_UNITS[system] || VOLUME_UNITS[DEFAULT_MEASUREMENT_SYSTEM];
  for (const [name, options] of Object.entries(units)) {
    try {
      math.createUnit(name, options, { override: true });
    } catch {
      // A unit that cannot be created is left as mathjs defines it.
    }
  }
}

function initMeasures(math, system = DEFAULT_MEASUREMENT_SYSTEM) {
  math.import(
    { __measure: (value, factor, target) => measure(math, value, factor, target) },
    { override: true }
  );
  applyMeasurementSystem(math, system);
}

export { preprocessMeasures, initMeasures, applyMeasurementSystem };
export default initMeasures;
