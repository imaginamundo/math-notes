import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// REVIEW.md MIX-01 (critical): a result such as `$24 a day for a year` is the
// compound unit `(USD year) / day`. It was stored raw and only simplified for
// display, so rounding, `prev`, `sum` and the total bar all worked on the raw
// number (24) instead of the value shown (US$ 8,766): `prev to nearest 100` gave
// US$ 0 and a sum with a plain amount gave 0 with a blank total.
const run = (lines) => createEngine({ rates: FIXTURE_RATES }).evaluateLines(lines);
const show = (lines, index) => {
  const row = run(lines).results[index];
  return row.type === 'error' ? `ERR ${row.value}` : formatResult(row.value);
};
const total = (lines) => {
  const { total: value } = run(lines);
  return value === null || value === undefined ? null : formatResult(value);
};

test('MIX-01: rounding acts on the value that is shown', () => {
  assert.equal(show(['$24 a day for a year', 'prev to nearest 100'], 0), 'US$ 8,766');
  assert.equal(show(['$24 a day for a year', 'prev to nearest 100'], 1), 'US$ 8,800');
  assert.equal(show(['$24 a day for a year to nearest 100'], 0), 'US$ 8,800');
  assert.equal(show(['24.4 km a day for a year', 'prev rounded'], 1), '8,912 km');
  assert.equal(show(['24.4 km a day for a year', 'prev to nearest 100'], 1), '8,900 km');
  assert.equal(show(['$12 a month for 2 years', 'prev to nearest 10'], 1), 'US$ 290');
  assert.equal(show(['€5 a day for 3 weeks', 'prev to nearest 10'], 1), '€ 110');
});

test('MIX-01: a computed duration rounds in the unit it is shown in', () => {
  const lines = ['time to upload 3 GB at 10 MB/s', 'prev rounded'];
  assert.equal(show(lines, 0), '5 min');
  assert.equal(show(lines, 1), '5 min');
  assert.equal(show(['time to upload 3 GB at 10 MB/s', 'prev rounded up'], 1), '5 min');
});

test('MIX-01: bare numbers fold into the unit that is shown', () => {
  assert.equal(total(['24 km a day for a year', '100']), '8,866 km');
  assert.equal(show(['24 km a day for a year', '100', 'sum'], 2), '8,866 km');
  // A computed duration is stored in seconds (the unit its value is in), so a bare
  // 10 is 10 seconds: 5 min 10 s. Folding by whatever unit looks best would make the
  // result depend on how large the number happens to be.
  assert.equal(
    show(['upload: time to upload 3 GB at 10 MB/s', 'buffer: 10', 'sum'], 2),
    '5 min 10 s'
  );
});

test('MIX-01: a currency compound sums with plain amounts of the same currency', () => {
  assert.equal(show(['rent: $1200', 'coffee: $5 a day for 30 days', 'sum'], 2), 'US$ 1,350');
  assert.equal(total(['rent: $1200', 'coffee: $5 a day for 30 days']), 'US$ 1,350');
  assert.equal(show(['$1200', '40 h * $25/h', 'sum'], 2), 'US$ 2,200');
  assert.equal(show(['$24 a day for a year', '$10', 'sum'], 2), 'US$ 8,776');
  assert.equal(
    show(['fuel: 7 l / 100 km * 300 km * $1.8/l', 'rent: $1200', 'sum'], 2),
    'US$ 1,237.8'
  );
});

test('MIX-01: two compounds of the same shape still sum, and rates stay rates', () => {
  assert.equal(show(['$24 a day for a year', '$12 a month for 2 years', 'sum'], 2), 'US$ 9,054');
  assert.equal(show(['$99 per week'], 0), 'US$ 99 per week');
  assert.equal(show(['100 USD/hour'], 0), 'US$ 100 per hour');
  assert.equal(show(['5 km/h * 2 h'], 0), '10 km');
  assert.equal(show(['7 l / 100 km'], 0), '0.07 l/km');
});

test('MIX-01: two different currencies are still reported, not summed', () => {
  const row = run(['$24 a day for a year', '€10', 'sum']).results[2];
  assert.equal(row.type, 'error');
  assert.match(String(row.value), /Cannot combine/);
});
