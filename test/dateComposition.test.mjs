import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// A date is an ordinary operand: it can sit in a variable, in a chain or in a longer
// expression, and the interval between two dates is a real duration.
const run = (lines) => createEngine({ rates: FIXTURE_RATES }).evaluateLines(lines);
const show = (lines, index = lines.length - 1) => {
  const row = run(lines).results[index];
  return row.type === 'error' ? `ERR ${row.value}` : formatResult(row.value);
};
const DATES = ['start = March 4, 2025', 'finish = June 10, 2025'];

test('dates held in variables subtract and add', () => {
  assert.equal(show([...DATES, 'finish - start']), '3 months 6 days');
  assert.equal(show([...DATES, 'start - finish']), '3 months 6 days');
  assert.equal(show([...DATES, 'gap = 3 days', 'start + gap']), '7 March 2025');
  assert.equal(show([...DATES, 'start + 2 weeks + 3 days']), '21 March 2025');
  assert.equal(show([...DATES, 'finish - 1 month']), '10 May 2025');
  assert.equal(show([...DATES, 'span = finish - start', 'span in days']), '98 days');
});

test('a chain of durations after a date or a clock time', () => {
  assert.equal(show(['June 10 2024 + 3 months + 5 days']), '15 September 2024');
  assert.equal(show(['June 10 2024 + 3 months - 5 days']), '5 September 2024');
  assert.equal(show(['16:00 + 3 hours + 12 minutes']), '19:12');
  assert.equal(show(['2024-01-31 + 1 month + 1 month']), '29 March 2024');
});

test('today, now and written dates work inside a longer expression', () => {
  assert.match(show(['today + 3 weeks + 2 days']), /\d/);
  assert.equal(show(['March 4, 2025 - March 1, 2025']), '3 days');
  assert.equal(show([...DATES, 'finish - March 4, 2025']), '3 months 6 days');
  assert.equal(show(['6:30 am', 'prev - 5:00 am']), '1 hour 30 minutes');
  assert.equal(show(['wake = 6:30 am', 'wake - 5:00 am']), '1 hour 30 minutes');
});

test('the interval between two dates is a real duration', () => {
  const trip = ['trip = January 10 - February 5'];
  assert.equal(show(trip), '3 weeks 5 days');
  assert.equal(show([...trip, 'trip + 3 days']), '29 days');
  assert.equal(show([...trip, 'trip in days']), '26 days');
  assert.equal(show([...trip, 'trip * 2']), '52 days');
  assert.equal(show(['January 10 - February 5', 'prev + 3 days']), '29 days');
});

test('intervals count in sums, groups and the total', () => {
  const sheet = ['January 10 - February 5', '3 days', 'sum'];
  assert.equal(show(sheet), '4 weeks 1 day');
  const { total } = run(sheet);
  assert.equal(formatResult(total), '4 weeks 1 day');
  assert.equal(
    show(['Trip:', 'January 10 - February 5', 'March 1 - March 10', 'end'], 0),
    '5 weeks'
  );
});
