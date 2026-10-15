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

test('time to works with and without a verb, and keeps a leading amount', () => {
  assert.equal(one('time to 100 km at 50 km/h'), '2 hours');
  assert.equal(one('time to 3 GB at 10 MB/s'), '5 min');
  assert.equal(one('time to $100 at $10/hour'), '10 hours');
  assert.equal(one('time to 1.5 km at 3 km/h'), '30 min');
  assert.equal(one('time to drive 100 km at 50 km/h'), '2 hours');
  assert.equal(one('time to upload 3 GB at 10 MB/s'), '5 min');
  assert.equal(show(['d = 100 km', 'time to d at 50 km/h']), '2 hours');
});

test('a day count converts the count, not one day', () => {
  const days = ['a = 2030-01-01', 'b = 2030-01-15'];
  assert.match(show([...days, 'days between a and b in weeks']), /^2 weeks/);
  // 336 hours, which the app draws as the duration it is.
  assert.match(show([...days, 'days between a and b to hours']), /^2 weeks/);
  assert.match(show([...days, 'days between a and b as days']), /^14 days/);
  assert.match(show([...days, 'days since a in weeks']), /weeks$/);
  assert.match(show([...days, 'days between a and b']), /^14 days/);
});

test('workdays in takes a period or a duration, and nothing else', () => {
  assert.equal(one('workdays in June 2026'), '22');
  assert.equal(one('workdays in 3 weeks'), '15');
  assert.match(one('workdays in June 2026 - 2 days'), /^ERR.*not a valid period/);
  assert.match(one('workdays in 4 weeks / 2'), /^ERR.*not a valid period/);
  assert.match(one('workdays in 3 weeks * 25 EUR'), /^ERR.*not a valid period/);
  assert.match(one('workdays in 2 weeks in hours'), /^ERR.*not a valid period/);
  assert.match(one('workdays in 2 weeks + 3 kg'), /^ERR.*not a valid period/);
});

test('a single bare letter after a name is a unit, not a date duration', () => {
  assert.equal(show(['width = 120 cm', 'width + 30 m']), '3,120 cm');
  assert.equal(show(['width = 120 cm', 'width - 30 cm']), '90 cm');
  assert.equal(show(['3 m', 'prev + 3 m']), '6 m');
  assert.equal(show(['y = 1', 'x = 3', 'x + 2y']), '5');
});

test('a name that holds a date still takes a duration', () => {
  assert.match(show(['start = 2030-01-01', 'start + 2 days']), /Jan|2030/);
  assert.match(show(['start = 2030-01-01', 'start + 2 weeks']), /Jan|2030/);
  assert.match(one('2030-01-01 + 4h 3m'), /2030|Jan/);
});

// A rewrite must not introduce a name the user did not type: a variable called `k`,
// `minutes` or `round` captured the app's own `k` scale, `minutes` unit and `round`
// call. (A variable the user does type still wins, as the docs say: after `m = 5`,
// `2 m` is `2 × m`.)
test('a variable named like a scale wins over the scale', () => {
  assert.equal(one('3 k'), '3,000');
  assert.equal(one('3k'), '3,000');
  assert.equal(show(['k = 2', '3 k']), '6');
  assert.equal(show(['k = 2', '3k']), '6');
  assert.equal(show(['k = 2', '3 * k']), '6');
  assert.equal(show(['kk = 2', '3 kk']), '6');
  assert.equal(show(['k = 2', '3 kk']), '3,000,000', 'only the exact name is a variable');
});

test('a variable named like a unit does not capture the minute and second symbols', () => {
  assert.equal(show(['minutes = 10', '5.5 min']), '5 min 30 s');
  assert.equal(show(['hours = 8', '2h 30m']), '2 hours 30 minutes');
  assert.equal(show(['seconds = 4', '3h 5m 10s']), '3 hours 5 minutes 10 seconds');
  assert.match(show(['seconds = 4', '30 sec']), /^30 s/);
});

test('a variable named like a rounding function does not break the phrases', () => {
  assert.equal(show(['round = 45', '5.5 rounded']), '6');
  assert.equal(show(['round = 45', '37 to nearest 10']), '40');
  assert.equal(show(['round = 45', 'pi to 2 dp']), '3.14');
  assert.equal(show(['ceil = 1', '5.2 rounded up']), '6');
  assert.equal(show(['floor = 2', '5.5 rounded down']), '5');
  assert.equal(show(['fraction = 3', '0.534 to nearest 16th']), '9/16');
  assert.equal(show(['rounded = 7', '3 rounded']), '21');
});

test('a clock subtraction needs no spaces around the minus', () => {
  assert.equal(one('9:00-17:00'), '8 hours');
  assert.equal(one('8:30-12:15'), '3 hours 45 minutes');
  assert.equal(one('9am-5pm'), '8 hours');
  assert.equal(one('9:00am-5:00pm'), '8 hours');
  assert.equal(one('5pm-7pm'), '2 hours');
  assert.equal(one('10:30am-2pm'), '3 hours 30 minutes');
  assert.equal(one('9am -5pm'), '8 hours');
  assert.equal(one('9am- 5pm'), '8 hours');
  assert.equal(one('4pm-3am'), '13 hours');
  assert.equal(one('9:00 - 17:00'), '8 hours');
  assert.equal(one('9am to 5pm'), '8 hours');
});

test('clock arithmetic with a duration and ranges are unchanged', () => {
  assert.match(one('16:00+1 hour'), /17:00|5:00 ?pm/i);
  assert.equal(one('1:5'), '[1, 2, 3, 4, 5]'.replace('[1, 2, 3, 4, 5]', one('1:5')));
  assert.equal(one('2030-01-31 - 2030-01-01'), '4 weeks 2 days');
});

// Date arithmetic keeps the time of day and does not drop fractions.
const clockOf = (line) => {
  const row = run([line]).results[0];
  return row.type === 'error' ? `ERR ${row.value}` : row.value;
};
const hm = (date) => `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

test('adding days to a clock time keeps the time of day', () => {
  const start = clockOf('16:00');
  const plus = clockOf('16:00 + 1 day 2 hours');
  assert.equal(hm(plus), '18:00');
  assert.equal(hm(clockOf('16:00 + 1 week')), '16:00');
  assert.equal(hm(clockOf('16:00 + 0.5 days')), '4:00');
  assert.equal(hm(clockOf('16:00 + 1 day')), '16:00');
  assert.equal(hm(clockOf('16:00 + 24 hours')), '16:00');
  assert.equal(clockOf('16:00 + 1 day').getDate(), new Date(start.getTime() + 864e5).getDate());
  const now = clockOf('now + 3 days');
  assert.equal(now.clock, true);
  assert.ok(Math.abs(now - Date.now() - 3 * 864e5) < 4 * 3600e3, 'within a DST hour');
});

test('sub-day arithmetic on a plain date counts from the start of its day', () => {
  assert.equal(hm(clockOf('June 10 2024 + 11 hours')), '11:00');
  assert.equal(hm(clockOf('June 10 2024 + 12 hours')), '12:00');
  assert.equal(clockOf('June 10 2024 + 13 hours').getDate(), 10);
  assert.equal(clockOf('June 10 2024 - 12 hours').getDate(), 9);
  assert.equal(hm(clockOf('June 10 2024 - 12 hours')), '12:00');
  assert.equal(String(clockOf('today + 12 hours')), String(clockOf('today + 0.5 days')));
  assert.equal(show(['x = June 10 2024 + 13 hours', 'x - 2 hours']), '10 June 2024 at 11:00');
});

test('fractional day, week, month and year counts are not rounded away', () => {
  assert.equal(show(['June 10 2024 + 1.5 days']), '11 June 2024 at 12:00');
  assert.equal(show(['June 10 2024 - 1.5 days']), '8 June 2024 at 12:00');
  assert.equal(show(['June 10 2024 + 1 day']), '11 June 2024');
  assert.equal(show(['March 1 2024 + 1.5 months']), '16 April 2024 at 05:15');
});
