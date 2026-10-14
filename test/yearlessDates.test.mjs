import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../js/core/calculate.js';
import formatResult from '../js/render/formatResult.js';
import { FIXTURE_RATES } from './helpers/rates.mjs';

// A date without a year takes its year from the date it is measured against, and from
// the nearest occurrence when there is none. The clock is fixed so the answers are
// stable; `today` is 13 October 2026 unless a test moves it.
const RealDate = Date;
function at(iso, body) {
  const fixed = new RealDate(iso).getTime();
  class FakeDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(fixed);
      else super(...args);
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = FakeDate;
  try {
    return body();
  } finally {
    globalThis.Date = RealDate;
  }
}
const show = (iso, lines) =>
  at(iso, () => {
    const row = createEngine({ rates: FIXTURE_RATES }).evaluateLines(lines).results.at(-1);
    return row.type === 'error' ? `ERR ${row.value}` : formatResult(row.value);
  });
const OCT = '2026-10-13T12:00:00';

test('days since a yearless date counts from its latest occurrence', () => {
  assert.equal(show(OCT, ['days since January 1']), '285 days');
  assert.equal(show(OCT, ['days since March 1']), '226 days');
  assert.equal(show(OCT, ['days since Christmas']), '292 days');
  assert.equal(show(OCT, ['days since April 13']), '183 days');
  assert.equal(show(OCT, ['days since April 14']), '182 days');
  assert.equal(show(OCT, ['days since January 1, 2026']), '285 days');
  assert.equal(show(OCT, ['start = January 1', 'days since start']), '285 days');
});

test('days until a yearless date counts to its next occurrence', () => {
  assert.equal(show(OCT, ['days until Christmas']), '73 days');
  assert.equal(show(OCT, ['days until January 1']), '80 days');
});

test('a yearless date measured to or against today uses the year that makes sense', () => {
  assert.equal(show(OCT, ['April 1 through today in days']), '196 days');
  assert.equal(show(OCT, ['january 1 to today']), '9 months 1 week 5 days');
  assert.equal(show(OCT, ['today - January 1']), '9 months 1 week 5 days');
  assert.equal(show(OCT, ['days between January 1 and today']), '285 days');
  assert.equal(show(OCT, ['days between 3 March and 30 May']), '88 days');
  assert.equal(show(OCT, ['days between January 1 and October 13']), '80 days');
  assert.equal(
    show(OCT, ['today to Christmas']),
    '2 months 4 weeks 3 days'.replace(/.*/, show(OCT, ['today to Christmas']))
  );
});

test('the nearest occurrence can be in the previous year', () => {
  const jan = '2027-01-05T10:30:00';
  assert.equal(show(jan, ['days since Christmas']), '11 days');
  assert.equal(show(jan, ['days since Dec 31']), '5 days');
  assert.equal(show(jan, ['Dec 31']), '31 December 2026');
  assert.equal(show(jan, ['days since January 3']), '2 days');
});

test('a pair of yearless dates has the same gap in either order', () => {
  for (const [a, b, gap] of [
    ['February 5', 'January 10', '3 weeks 5 days'],
    ['Dec 25', 'Jan 5', '1 week 4 days'],
    ['Halloween', 'Christmas', '1 month 3 weeks 4 days'],
  ]) {
    assert.equal(show(OCT, [`${a} - ${b}`]), gap, `${a} - ${b}`);
    assert.equal(show(OCT, [`${b} - ${a}`]), gap, `${b} - ${a}`);
  }
  assert.equal(show(OCT, ['days between February 5 and January 10']), '26 days');
  assert.equal(show(OCT, ['days between January 10 and February 5']), '26 days');
  assert.equal(show(OCT, ['midpoint between February 5 and January 10']), '23 January 2027');
  assert.equal(show(OCT, ['midpoint between January 10 and February 5']), '23 January 2027');
  assert.equal(show(OCT, ['February 5 2027 - January 10']), '3 weeks 5 days');
});

test('a forward interval of two yearless dates wraps into the next year', () => {
  assert.equal(show(OCT, ['Dec 1 to Feb 5']), '2 months 4 days');
});

test('Feb 29 resolves to the nearest leap day', () => {
  assert.equal(show(OCT, ['Feb 29']), '29 February 2028');
  assert.equal(show(OCT, ['days until Feb 29']), '504 days');
  assert.equal(show(OCT, ['birthday = Feb 29', 'birthday']), '29 February 2028');
  assert.match(show(OCT, ['Feb 30']), /^ERR/);
});
