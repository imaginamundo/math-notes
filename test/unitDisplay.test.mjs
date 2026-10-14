import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { simplifyLocal } from '../js/core/unitSimplify.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// REVIEW.md UNIT-02: the unit a compound result is shown in used to be the last
// unit of that dimension mathjs had parsed anywhere (other lines, deleted lines,
// other tabs, startup), so `2 m * 300 cm * 4 m` read "6,000 gallon" on a fresh
// sheet. What a line shows must depend on the line.
const COMPOUNDS = [
  '2 m * 300 cm * 4 m',
  '60 cm * 30 cm * 0.4 m',
  '2 kW * 3 h',
  '5 N * 2 m',
  '1 m * 50 cm',
  '3 V * 2 A',
  '24 km a day for a year',
  '500 m / 3 hours * 60 km/hour',
  '$30/hour * 40 hours',
];

// Lines that parse a unit of nearly every dimension, to move mathjs's preferences.
const NOISE = [
  '1 BTU',
  '1 acre',
  '1 eV',
  '1 hp',
  '1 gal',
  '1 CHF',
  '1 kWh',
  'height = 6 ft',
  'fuel = 1 l petrol in kWh',
  '5 kWh in BTU',
];

const engine = () => createEngine({ rates: FIXTURE_RATES });
const show = (lines, index) => formatResult(engine().evaluateLines(lines).results[index].value);

test('UNIT-02: a compound result shows the same unit whatever else is in the sheet', () => {
  const different = [];
  for (const line of COMPOUNDS) {
    const alone = show([line], 0);
    const after = show([...NOISE, line], NOISE.length);
    const before = show([line, ...NOISE], 0);
    if (alone !== after || alone !== before) {
      different.push(`${line}: alone ${alone}, after noise ${after}, before noise ${before}`);
    }
  }
  assert.deepEqual(different, []);
});

test('UNIT-02: deleting the line that set a preference does not leave it behind', () => {
  const e = engine();
  const line = '3 V * 2 A';
  const alone = formatResult(e.evaluateLines([line]).results[0].value);
  e.evaluateLines([line, '1 hp', '1 eV']);
  const afterDelete = formatResult(e.evaluateLines([line]).results[0].value);
  assert.equal(afterDelete, alone);
});

test('UNIT-02: a volume built from lengths is not shown as a named volume unit', () => {
  const shown = show(['2 m * 300 cm * 4 m'], 0);
  assert.doesNotMatch(shown, /gallon|pint|quart|cup|litre|liter|barrel/i);
  assert.match(shown, /m\^3|m³/);
});

test('UNIT-02: compound results are shown in the units they were written in, or SI', () => {
  assert.equal(show(['24 km a day for a year'], 0), '8,766 km', 'the documented example');
  assert.equal(show(['2 m * 300 cm * 4 m'], 0), '24 m^3');
  assert.equal(show(['5 N * 2 m'], 0), '10 J');
  assert.equal(show(['2 m * 3 m * 4 m'], 0), '24 m^3');
  assert.equal(show(['1 m * 50 cm'], 0), '0.5 m^2');
  assert.equal(show(['3 V * 2 A'], 0), '6 W');
  assert.equal(show(['$30/hour * 40 hours'], 0), 'US$ 1,200');
});

test('UNIT-02: simplifyLocal leaves mathjs on the unit system it found', () => {
  const unit = createEngine().evaluateLines(['2 m * 300 cm * 4 m']).results[0].value;
  const Unit = unit.constructor;
  const before = Unit.getUnitSystem();
  simplifyLocal(unit);
  assert.equal(Unit.getUnitSystem(), before);
  // Nothing from one call may be left for the next.
  simplifyLocal(createEngine().evaluateLines(['5 N * 2 m']).results[0].value);
  assert.equal(formatResult(unit), '24 m^3');
});

test('UNIT-02: simplifyLocal passes a non-unit through', () => {
  assert.equal(simplifyLocal(5), 5);
  assert.equal(simplifyLocal(null), null);
  assert.equal(simplifyLocal('x'), 'x');
});
