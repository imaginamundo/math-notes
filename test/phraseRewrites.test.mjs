import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// Phrase features are rewrites of the line's text before mathjs sees it. These tests
// run whole lines through the engine, so a rewrite that misfires shows as a wrong
// value or a leaked mathjs error, not just as a different string.
const run = (lines) => createEngine({ rates: FIXTURE_RATES }).evaluateLines(lines);
const show = (lines, index = lines.length - 1) => {
  const row = run(lines).results[index];
  return row.type === 'error' ? `ERR ${row.value}` : formatResult(row.value);
};
const one = (line) => show([line], 0);

test('at works whatever the length of its operands', () => {
  assert.equal(show(['rate = 5', 'rate at 2']), '10');
  assert.equal(one('5 at 25'), '125');
  assert.equal(one('30 hours at 5'), '6 days 6 hours', '150 hours, drawn as a timespan');
  assert.equal(show(['x = 2 at 3', 'x + 1']), '7');
  assert.equal(one('$100 at 2'), 'US$ 200');
  assert.equal(one('10 km at 5'), '50 km');
  assert.equal(show(['r = 5', 'r at pi']), '15.708…');
  assert.equal(one('30 hours at $30/hour'), 'US$ 900');
});

test('a capital A is the ampere, and only lowercase a/an are rate words', () => {
  assert.equal(one('3 A h'), '10,800 C');
  assert.equal(one('2 A s'), '2 C');
  assert.equal(one('10 A to mA'), '10,000 mA');
  assert.equal(one('10 A in mA'), '10,000 mA');
  assert.equal(one('10 A as mA'), '10,000 mA');
  assert.equal(one('12 V * 3 A to W'), '36 W');
  assert.equal(one('24 km a day for a year'), '8,766 km');
  assert.equal(one('$99 per week'), 'US$ 99 per week');
  assert.equal(one('$99 PER week'), 'US$ 99 per week');
  assert.equal(one('$12 an hour'), 'US$ 12 per hour');
});

test('a variable named a or an is not a rate word', () => {
  assert.equal(show(['a = 7', 'x = a mod 3', 'x']), '1');
  assert.equal(show(['a = 2 km', 'a to m']), '2,000 m');
});

test('min and sec are the minute and the second as a unit, wherever a unit goes', () => {
  assert.equal(one('1 h to min'), '60 minutes');
  assert.equal(one('120 s to min'), '2 minutes');
  assert.equal(one('90 s as min'), '1.5 minutes');
  assert.equal(one('1.5 hours in min'), '90 minutes');
  assert.equal(show(['x = 90 s', 'x to min']), '1.5 minutes');
  assert.match(one('60 km/h to m/min'), /^1,000 m\/min/);
  assert.match(one('10 km / 2 h to km/min'), /^0\.08/);
  assert.match(one('30 sec'), /^30 sec/);
  assert.match(one('90 sec in s'), /^90 s/);
  assert.equal(one('min(2, 3)'), '2', 'the function still works');
  assert.equal(one('5 min'), '5 min');
});

test('a length, mass or volume written in two units is their sum', () => {
  assert.match(one('6 ft 2 in'), /^74 in/);
  assert.match(one('1 m 80 cm'), /^180 cm/);
  assert.match(one('5 ft 10 in to cm'), /^177\.8 cm/);
  assert.match(one('1 m 80 cm to m'), /^1\.8 m/);
  assert.match(one('1 lb 4 oz in kg'), /^0\.567/);
  assert.match(one('1 kg 200 g'), /^1,200 g/);
  assert.match(one('3 l 200 ml'), /^3,200 ml/);
  assert.match(show(['height = 5 ft 11 in', 'height to cm']), /^180\.34 cm/);
  assert.match(one('6ft 2in'), /^74 in/);
  assert.match(one('6 ft 2 in + 1 in'), /^75 in/);
  assert.match(one('2 * 6 ft 2 in'), /^148 in/);
});

test('units that do not combine, or the same unit twice, are left alone', () => {
  assert.match(one('6 ft + 2 in to cm'), /^187\.96 cm/);
  assert.equal(one('1 h 30 min'), '1 hour 30 minutes');
  assert.doesNotMatch(one('3 m 4 s'), /^74|^ERR.*sum/);
  assert.equal(one('2 m * 3 m'), '6 m^2');
  assert.equal(one('2 kg * 3'), '6 kg');
});
